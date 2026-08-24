import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { sysLog, logAudit } from "@/lib/system-logger";
import { validateCredentials } from "@/lib/auth-credentials";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      // Allow linking Google to existing accounts (same email)
      // Safe here because Google only returns verified emails
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Per-account brute-force throttle (activity 16). Keyed by account only,
        // NOT IP, so rotating IPs can't bypass it. A successful login resets the
        // counter, so an active user never locks themselves out.
        const acct = String(credentials?.email ?? "").toLowerCase() || "unknown";
        const key = `login:acct:${acct}`;
        const rl = rateLimit(key, { max: 10, windowMs: 10 * 60 * 1000 });
        if (!rl.allowed) return null; // throttled; skips bcrypt
        const result = await validateCredentials(
          credentials?.email ?? "",
          credentials?.password ?? ""
        );
        if (result) resetRateLimit(key); // success doesn't consume the budget
        return result;
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

          // Assign to default clinic
          const defaultClinic = await prisma.clinic.findFirst({
            where: { isActive: true },
            select: { id: true },
          });

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
              // consentAcceptedAt intentionally NOT set — patient must explicitly
              // accept clinical data consent on /dashboard/consent (GDPR)
              clinicId: defaultClinic?.id || null,
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
