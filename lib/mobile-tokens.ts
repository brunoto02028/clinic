import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import type { ValidatedUser } from "@/lib/auth-credentials";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is not configured");
  }
  return secret;
}

export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  clinicId: string | null;
  clinicName: string | null;
  clinicSlug: string | null;
  clinicType: string | null;
  permissions: ValidatedUser["permissions"];
  /**
   * Quem pediu esta sessão, quando ela é de uma pessoa gerida (091 T-7).
   *
   * O Bruno: *"se o paciente é uma criança, a mãe tem que fazer o cadastro e
   * colocar a criança como uma dependente. E é a criança que está fazendo o
   * tratamento de reabilitação."*
   *
   * A mãe precisa **ver e agir como a filha** — consulta, protocolo, exercício
   * prescrito. Há 45 relações clínicas penduradas em `User`, e cada rota do
   * app lê `payload.sub`. Fazer o token dizer "esta requisição é sobre a
   * filha" faz todas elas funcionarem sem mudar uma linha.
   *
   * **Presente, este campo é uma restrição, não um poder.** Ele existe para as
   * rotas que não podem ser executadas por terceiro — gastar dinheiro, trocar
   * senha, apagar a conta, gerir dependentes — recusarem. É o mesmo papel que
   * `isImpersonating` faz na web.
   */
  onBehalfOf?: string;
}

/** Signs a short-lived access JWT mirroring the web session payload. */
export function signAccessToken(user: ValidatedUser): string {
  const payload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    clinicId: user.clinicId,
    clinicName: user.clinicName,
    clinicSlug: user.clinicSlug,
    clinicType: user.clinicType,
    permissions: user.permissions,
  };
  return jwt.sign(payload, getSecret(), {
    algorithm: "HS256",
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

/**
 * Uma sessão curta **sobre** uma pessoa gerida, pedida por quem responde por
 * ela (091 T-7).
 *
 * `sub` é a criança: é isso que faz as rotas clínicas devolverem a agenda, o
 * protocolo e os exercícios dela sem nenhuma delas saber que existe um
 * responsável no meio.
 *
 * **Não há refresh token.** É deliberado: a criança nunca ganha uma sessão
 * própria e durável — quem tem sessão é o responsável, e este token é
 * emprestado dela. Quando expira, o app pede outro com o token do responsável,
 * e a checagem de `managedById` acontece de novo. Um refresh aqui seria uma
 * credencial da criança vivendo por conta própria, que é exatamente o que a
 * T-7 existe para impedir.
 *
 * Sem permissões: uma pessoa gerida é sempre paciente, nunca equipe.
 */
export function signManagedPatientToken(opts: {
  child: { id: string; firstName: string; lastName: string; clinicId: string | null };
  guardian: AccessTokenPayload;
}): string {
  const { child, guardian } = opts;
  const payload: AccessTokenPayload = {
    sub: child.id,
    // O e-mail sintético não vai no token: nada deve tentar escrever para ele,
    // e mostrá-lo faria uma tela sugerir que a criança tem caixa de entrada.
    email: "",
    role: "PATIENT",
    firstName: child.firstName,
    lastName: child.lastName,
    clinicId: child.clinicId,
    clinicName: guardian.clinicName,
    clinicSlug: guardian.clinicSlug,
    clinicType: guardian.clinicType,
    permissions: {
      canManageUsers: false,
      canManageAppointments: false,
      canManageArticles: false,
      canManageSettings: false,
      canViewAllPatients: false,
      canCreateClinicalNotes: false,
    } as ValidatedUser["permissions"],
    onBehalfOf: guardian.sub,
  };
  return jwt.sign(payload, getSecret(), { algorithm: "HS256", expiresIn: ACCESS_TOKEN_TTL });
}

/**
 * Esta requisição é de alguém agindo por outra pessoa?
 *
 * Toda rota que gasta dinheiro, troca credencial, apaga conta ou gere
 * dependentes tem de recusar quando isto for verdade.
 */
export function ehSessaoDeTerceiro(payload: AccessTokenPayload): boolean {
  return !!payload.onBehalfOf;
}

/** Verifies an access JWT. Throws if invalid/expired. Algorithm is pinned. */
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, getSecret(), {
    algorithms: ["HS256"],
  }) as AccessTokenPayload;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Issues a new opaque refresh token, persisting only its hash.
 * Returns the plaintext token (only time it exists outside the client).
 */
export async function issueRefreshToken(
  userId: string,
  userAgent?: string
): Promise<string> {
  const plaintext = crypto.randomBytes(32).toString("hex");
  await prisma.mobileRefreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(plaintext),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      userAgent: userAgent?.slice(0, 255) || null,
    },
  });
  return plaintext;
}

/**
 * Validates and rotates a refresh token: revokes the presented one and issues a
 * fresh pair-half. Returns the userId on success, or null if invalid/expired/revoked.
 */
export async function rotateRefreshToken(
  plaintext: string,
  userAgent?: string
): Promise<{ userId: string; refreshToken: string } | null> {
  const tokenHash = hashToken(plaintext);
  const existing = await prisma.mobileRefreshToken.findUnique({
    where: { tokenHash },
  });

  if (!existing || existing.expiresAt < new Date()) {
    return null;
  }

  // Reuse detection: an already-revoked token being presented signals a
  // possible stolen/replayed token. Revoke the user's whole active family.
  if (existing.revokedAt) {
    await revokeAllForUser(existing.userId);
    return null;
  }

  // Atomic rotation: the conditional revoke is the concurrency guard. If two
  // requests race with the same refresh token, only one update affects a row.
  const revoked = await prisma.mobileRefreshToken.updateMany({
    where: { id: existing.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (revoked.count !== 1) {
    return null; // lost the race — another request already rotated it
  }

  const refreshToken = await issueRefreshToken(existing.userId, userAgent);
  return { userId: existing.userId, refreshToken };
}

/** Revokes every active refresh token for a user (logout-all / reuse response). */
export async function revokeAllForUser(userId: string): Promise<void> {
  await prisma.mobileRefreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Revokes a refresh token (logout). No-op if not found. */
export async function revokeRefreshToken(plaintext: string): Promise<void> {
  const tokenHash = hashToken(plaintext);
  await prisma.mobileRefreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
