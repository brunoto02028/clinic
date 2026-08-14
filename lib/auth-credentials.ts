import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sysLog, logAudit, trackFailedLogin } from "@/lib/system-logger";

/**
 * Shape returned on a successful credential validation.
 * Mirrors the object returned by the NextAuth CredentialsProvider so web and
 * mobile auth stay in sync.
 */
export interface ValidatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  firstName: string;
  lastName: string;
  clinicId: string | null;
  clinicName: string | null;
  clinicSlug: string | null;
  permissions: {
    canManageUsers: boolean;
    canManageAppointments: boolean;
    canManageArticles: boolean;
    canManageSettings: boolean;
    canViewAllPatients: boolean;
    canCreateClinicalNotes: boolean;
    canManageFootScans: boolean;
    canManageOrders: boolean;
  };
}

/**
 * Validates email/password against the database. Single source of truth for
 * credential auth, used by both the NextAuth CredentialsProvider (web) and the
 * mobile login endpoint. Throws on any failure with a user-safe message.
 *
 * @param ip best-effort client IP for failed-login tracking ("unknown" if absent)
 */
export async function validateCredentials(
  email: string,
  password: string,
  ip: string = "unknown"
): Promise<ValidatedUser> {
  if (!email || !password) {
    throw new Error("Please provide both email and password");
  }

  const normalizedEmail = email.toLowerCase();

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
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
      sysLog.auth(`Login failed: unknown email ${normalizedEmail}`, {
        level: "WARN",
        details: { email: normalizedEmail, reason: "unknown_email" },
        source: "auth",
      });
      throw new Error("Invalid email or password");
    }

    if (!user.isActive) {
      // isActive carries two very different meanings: an account the clinic
      // switched off, and one that simply never finished email verification.
      // Both used to answer "contact support", which sent brand-new patients
      // chasing a problem that did not exist — the only route to /verify is a
      // URL handed out at signup, so closing that tab stranded them for good.
      // emailVerified separates the two: verify-code sets it alongside isActive.
      if (!user.emailVerified) {
        throw new Error("EMAIL_NOT_VERIFIED");
      }
      throw new Error("Account is deactivated. Please contact support.");
    }

    if (!user.password) {
      throw new Error(
        "This account uses Google sign-in. Please use the 'Sign in with Google' button."
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      sysLog.auth(`Login failed: wrong password for ${user.email}`, {
        level: "WARN",
        details: { email: user.email, userId: user.id, reason: "wrong_password" },
        source: "auth",
      });
      trackFailedLogin(user.email, ip);
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
}

/**
 * Loads a user by id in the same shape as validateCredentials, for re-issuing
 * tokens on refresh. Returns null if the user is missing or deactivated.
 */
export async function getValidatedUserById(
  id: string
): Promise<ValidatedUser | null> {
  const user = await prisma.user.findUnique({
    where: { id },
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

  if (!user || !user.isActive) {
    return null;
  }

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
}
