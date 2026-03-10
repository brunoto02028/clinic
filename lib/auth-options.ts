import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sysLog, logAudit, trackFailedLogin } from "@/lib/system-logger";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      // Only link if the Google email is verified (default NextAuth behavior)
      // This prevents account takeover via unverified email linking
      allowDangerousEmailAccountLinking: false,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please provide both email and password");
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase() },
            include: {
              clinic: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  primaryColor: true,
                  secondaryColor: true,
                },
              },
            },
          });

          if (!user) {
            sysLog.auth(`Login failed: unknown email ${credentials.email.toLowerCase()}`, {
              level: "WARN",
              details: { email: credentials.email.toLowerCase(), reason: "unknown_email" },
              source: "auth",
            });
            throw new Error("Invalid email or password");
          }

          if (!user.isActive) {
            throw new Error("Account is deactivated. Please contact support.");
          }

          if (!user.password) {
            throw new Error("This account uses Google sign-in. Please use the 'Sign in with Google' button.");
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            sysLog.auth(`Login failed: wrong password for ${user.email}`, {
              level: "WARN",
              details: { email: user.email, userId: user.id, reason: "wrong_password" },
              source: "auth",
            });
            trackFailedLogin(user.email, "unknown");
            throw new Error("Invalid email or password");
          }

          logAudit({
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            userName: `${user.firstName} ${user.lastName}`,
            action: "LOGIN_SUCCESS",
            entity: "User",
            entityId: user.id,
            description: `${user.firstName} ${user.lastName} logged in successfully`,
          });
          sysLog.auth(`Login success: ${user.email} (${user.role})`, {
            level: "INFO",
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            source: "auth",
          });

          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            clinicId: user.clinicId,
            clinicName: user.clinic?.name || null,
            clinicSlug: user.clinic?.slug || null,
            permissions: {
              canManageUsers: user.canManageUsers,
              canManageAppointments: user.canManageAppointments,
              canManageArticles: user.canManageArticles,
              canManageSettings: user.canManageSettings,
              canViewAllPatients: user.canViewAllPatients,
              canCreateClinicalNotes: user.canCreateClinicalNotes,
              canManageFootScans: user.canManageFootScans,
              canManageOrders: user.canManageOrders,
            },
          };
        } catch (error: any) {
          console.error("[AUTH] Login error:", error?.message);
          if (
            error?.message?.includes("Can't reach") ||
            error?.message?.includes("Timed out") ||
            error?.message?.includes("connection pool") ||
            error?.message?.includes("prisma")
          ) {
            throw new Error("Service temporarily unavailable. Please try again in a moment.");
          }
          throw error;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // For Google OAuth: auto-create or link PATIENT account
      if (account?.provider === "google" && profile?.email) {
        try {
          const email = profile.email.toLowerCase();
          const existingUser = await prisma.user.findUnique({ where: { email } });

          if (existingUser) {
            // User exists — allow sign-in if active
            if (!existingUser.isActive) {
              return "/login?error=AccountDeactivated";
            }
            // Update profile image from Google if not set
            if (!existingUser.profileImageUrl && (profile as any).picture) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                  profileImageUrl: (profile as any).picture,
                  emailVerified: existingUser.emailVerified || new Date(),
                },
              });
            }
            logAudit({
              userId: existingUser.id,
              userEmail: existingUser.email,
              userRole: existingUser.role,
              userName: `${existingUser.firstName} ${existingUser.lastName}`,
              action: "LOGIN_SUCCESS",
              entity: "User",
              entityId: existingUser.id,
              description: `${existingUser.firstName} ${existingUser.lastName} signed in via Google`,
            });
            return true;
          }

          // New user — create PATIENT account (Google-verified, no password needed)
          const googleName = profile.name || "";
          const nameParts = googleName.split(" ");
          const firstName = (profile as any).given_name || nameParts[0] || "Patient";
          const lastName = (profile as any).family_name || nameParts.slice(1).join(" ") || "";

          const newUser = await prisma.user.create({
            data: {
              email,
              firstName,
              lastName,
              role: "PATIENT",
              isActive: true,
              emailVerified: new Date(),
              profileImageUrl: (profile as any).picture || null,
              preferredLocale: "en-GB",
              consentAcceptedAt: new Date(),
            },
          });

          // Send welcome email (async, don't block sign-in)
          try {
            const { sendTemplatedEmail } = require("@/lib/email-templates");
            const appUrl = process.env.NEXTAUTH_URL || "";
            await sendTemplatedEmail("WELCOME", email, {
              patientName: firstName,
              portalUrl: `${appUrl}/dashboard`,
              clinicPhone: "Contact us via the website",
            }, newUser.id);
          } catch (emailErr) {
            console.error("[AUTH] Failed to send welcome email:", emailErr);
          }

          sysLog.auth(`New patient via Google: ${email}`, {
            level: "INFO",
            userId: newUser.id,
            userEmail: email,
            userRole: "PATIENT",
            source: "auth",
          });

          return true;
        } catch (err: any) {
          console.error("[AUTH] Google signIn error:", err);
          return "/login?error=OAuthError";
        }
      }

      return true;
    },
    async jwt({ token, user, account, trigger }) {
      // On initial sign-in from credentials provider
      if (user && account?.provider === "credentials") {
        token.id = user.id;
        token.role = (user as any).role;
        token.firstName = (user as any).firstName;
        token.lastName = (user as any).lastName;
        token.clinicId = (user as any).clinicId;
        token.clinicName = (user as any).clinicName;
        token.clinicSlug = (user as any).clinicSlug;
        token.permissions = (user as any).permissions;
      }

      // On initial sign-in from Google OAuth — load user data from DB
      if (account?.provider === "google" && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: (token.email as string).toLowerCase() },
          include: {
            clinic: { select: { id: true, name: true, slug: true } },
          },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.firstName = dbUser.firstName;
          token.lastName = dbUser.lastName;
          token.clinicId = dbUser.clinicId;
          token.clinicName = dbUser.clinic?.name || null;
          token.clinicSlug = dbUser.clinic?.slug || null;
          token.permissions = {
            canManageUsers: dbUser.canManageUsers,
            canManageAppointments: dbUser.canManageAppointments,
            canManageArticles: dbUser.canManageArticles,
            canManageSettings: dbUser.canManageSettings,
            canViewAllPatients: dbUser.canViewAllPatients,
            canCreateClinicalNotes: dbUser.canCreateClinicalNotes,
            canManageFootScans: dbUser.canManageFootScans,
            canManageOrders: dbUser.canManageOrders,
          };
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).firstName = token.firstName;
        (session.user as any).lastName = token.lastName;
        (session.user as any).clinicId = token.clinicId;
        (session.user as any).clinicName = token.clinicName;
        (session.user as any).clinicSlug = token.clinicSlug;
        (session.user as any).permissions = token.permissions;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    signOut: "/signout",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
