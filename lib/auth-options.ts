import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sysLog, logAudit, trackFailedLogin } from "@/lib/system-logger";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
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
            // Log failed login - unknown email
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

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            // Log failed login - wrong password
            sysLog.auth(`Login failed: wrong password for ${user.email}`, {
              level: "WARN",
              details: { email: user.email, userId: user.id, reason: "wrong_password" },
              source: "auth",
            });
            trackFailedLogin(user.email, "unknown");
            throw new Error("Invalid email or password");
          }

          // Log successful login
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
          // Never expose raw DB/Prisma errors to the client
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.firstName = (user as any).firstName;
        token.lastName = (user as any).lastName;
        token.clinicId = (user as any).clinicId;
        token.clinicName = (user as any).clinicName;
        token.clinicSlug = (user as any).clinicSlug;
        token.permissions = (user as any).permissions;
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
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
