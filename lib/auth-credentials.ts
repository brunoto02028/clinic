import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sysLog, logAudit, trackFailedLogin } from "@/lib/system-logger";

// The tenant logo carried in the session: an absolute URL or an uploaded image
// served by /api/image-serve (studio branding, activity 52 T-3) — never a
// data: URL, which would bloat the session cookie.
export function sessionLogoUrl(url: string | null | undefined): string | null {
  return url && /^(https?:\/\/|\/api\/image-serve\/)/.test(url) ? url : null;
}

// The same logo, absolute — the native app can't resolve "/api/image-serve/…",
// so mobile responses carry the full URL (activity 52, T-3).
export function absoluteLogoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!url.startsWith("/")) return url;
  const base = (process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  return base ? `${base}${url}` : null;
}


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
  clinicType: string | null;
  clinicLogoUrl: string | null;
  clinicPrimaryColor: string | null;
  instagramImportEnabled: boolean;
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
            type: true,
            logoUrl: true,
            primaryColor: true,
            secondaryColor: true,
            instagramImportEnabled: true,
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

    /**
     * Conta gerida não entra — nunca (091 T-7).
     *
     * O Bruno: *"se o paciente é uma criança, a mãe tem que fazer o cadastro e
     * colocar a criança como uma dependente. E é a criança que está fazendo o
     * tratamento de reabilitação."*
     *
     * A criança precisa de prontuário de verdade — consulta, protocolo, nota
     * clínica —, e são 45 relações clínicas penduradas em `User`. Por isso ela
     * **é** um `User`, e por isso esta recusa existe.
     *
     * Ela vem antes de tudo de propósito. O endereço de e-mail de uma conta
     * gerida é sintético e não recebe nada, e a senha é nula, então na prática
     * não há por onde entrar. Mas "na prática" é frágil: basta alguém, um dia,
     * acrescentar um login por link ou definir uma senha por script. Esta
     * linha é a camada que não depende de ninguém lembrar.
     *
     * A mensagem é a genérica de propósito: dizer "esta conta é gerida"
     * confirmaria, a quem estivesse tentando, que aquela pessoa existe.
     */
    if (user.managedById) {
      sysLog.auth(`Login refused: managed account ${user.id}`, {
        level: "WARN",
        details: { userId: user.id, reason: "managed_account" },
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
      // Duas contas chegam aqui e a mensagem precisa servir às duas: quem
      // entrou pelo Google (nunca teve senha) e quem a clínica acabou de
      // cadastrar, que recebeu um convite para definir a sua (075). Dizer só
      // "use o Google" mandava metade das pessoas para um botão que não
      // resolve o problema delas.
      throw new Error(
        "This account has no password yet. Use 'Forgot your password?' to set one, or sign in with Google if that is how it was created."
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
      clinicType: user.clinic?.type || null,
      clinicLogoUrl: sessionLogoUrl(user.clinic?.logoUrl),
      clinicPrimaryColor: user.clinic?.primaryColor || null,
      instagramImportEnabled: user.clinic?.instagramImportEnabled || false,
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
          type: true,
          logoUrl: true,
          primaryColor: true,
          secondaryColor: true,
          instagramImportEnabled: true,
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
    clinicType: user.clinic?.type || null,
    clinicLogoUrl: sessionLogoUrl(user.clinic?.logoUrl),
    clinicPrimaryColor: user.clinic?.primaryColor || null,
    instagramImportEnabled: user.clinic?.instagramImportEnabled || false,
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
