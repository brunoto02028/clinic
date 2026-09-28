import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { resolveJoinTenant } from "@/lib/join-tenant";
import { checkPatientLimit } from "@/lib/tenant-limits";
import { getDefaultPatientModuleOverrides } from "@/lib/patient-defaults";
import { canUsePatientApp, patientOnlyRefusal } from "@/lib/mobile-patient-only";
import { sysLog, logAudit } from "@/lib/system-logger";

/**
 * Entrar pelo Google ou pela Apple: a parte que é igual nos dois (097 T-1/T-4).
 *
 * ## Por que num lugar só
 *
 * O que muda entre os dois provedores é **como se prova quem é a pessoa** —
 * chaves diferentes, claims diferentes, nomes que vêm em lugares diferentes.
 * O que acontece **depois** da prova é palavra por palavra o mesmo: achar a
 * conta pelo `sub`, recusar conta gerida, recusar conta da clínica, recusar
 * quem já tem conta com aquele e-mail e não ligou o provedor, ou criar um
 * paciente novo.
 *
 * Duas cópias dessa sequência envelheceriam diferente, e a que envelhecesse
 * pior seria a que ninguém olha — que é justamente onde uma falha de
 * autenticação mora sem ser vista.
 */

export interface IdentidadeSocial {
  /** Como está gravado em `Account.provider` — é a chave da unicidade. */
  provider: "google" | "apple";
  /** O identificador estável da pessoa no provedor. O e-mail muda; este não. */
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
  picture?: string | null;
}

export type ResultadoSocial =
  | { tipo: "ok"; userId: string; novo: boolean }
  | { tipo: "recusado"; status: number; corpo: Record<string, unknown> };

/** A mesma frase genérica do login por senha, pelo mesmo motivo: dizer "esta
 *  conta é gerida" confirmaria, a quem estivesse tentando, que ela existe. */
const RECUSA_GENERICA = {
  tipo: "recusado" as const,
  status: 401,
  corpo: { error: "Invalid email or password" },
};

export async function entrarOuCriarComIdentidade(
  identidade: IdentidadeSocial,
  opts?: { tenantSlug?: string | null; origem?: string }
): Promise<ResultadoSocial> {
  const { provider, sub, email } = identidade;
  const origem = opts?.origem || "app";
  const nomeDoProvedor = provider === "google" ? "Google" : "Apple";

  // ------------------------------------------------------------------ login
  const conta = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId: sub } },
    select: { userId: true },
  });

  if (conta) {
    const dono = await prisma.user.findUnique({
      where: { id: conta.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        managedById: true,
        firstName: true,
        lastName: true,
      },
    });
    if (!dono || !dono.isActive || dono.managedById) return RECUSA_GENERICA;
    if (!canUsePatientApp(dono.role)) {
      return { tipo: "recusado", status: 403, corpo: patientOnlyRefusal() };
    }

    logAudit({
      userId: dono.id,
      userEmail: dono.email,
      userRole: dono.role,
      userName: `${dono.firstName} ${dono.lastName}`,
      action: "LOGIN_SUCCESS",
      entity: "User",
      entityId: dono.id,
      description: `${dono.firstName} ${dono.lastName} signed in via ${nomeDoProvedor} (${origem})`,
    });

    return { tipo: "ok", userId: dono.id, novo: false };
  }

  // ----------------------------------------- já existe conta com esse e-mail?
  const mesmoEmail = email
    ? await prisma.user.findUnique({
        where: { email },
        select: { id: true, isActive: true, managedById: true, password: true },
      })
    : null;

  if (mesmoEmail) {
    if (!mesmoEmail.isActive || mesmoEmail.managedById) return RECUSA_GENERICA;
    /**
     * **Não vincular automaticamente** — a regra 2 da spec do Bruno (T-2).
     *
     * O provedor só devolve e-mail verificado, então vincular seria cômodo.
     * Mas o e-mail do cadastro pode ser um endereço que a clínica digitou
     * errado, ou que um dia foi de outra pessoa. Num prontuário clínico,
     * entrar na conta errada é o pior erro possível.
     *
     * A prova a mais é a senha: o app pede uma vez e então chama
     * `/api/mobile/auth/<provedor>/link`.
     */
    return {
      tipo: "recusado",
      status: 409,
      corpo: {
        error: `There is already an account with this email. Sign in with your password once, and we will connect ${nomeDoProvedor} for next time.`,
        code: "account_exists",
        // Sem senha, "entre com a sua senha" é um beco sem saída: a conta
        // nasceu pela clínica e nunca teve uma. O app manda para o "esqueci".
        hasPassword: !!mesmoEmail.password,
      },
    };
  }

  // ------------------------------------------------------------- conta nova
  // Não é decisão de produto nova: `/api/mobile/register` já cria paciente por
  // conta própria. Isto é o mesmo caminho, por outra porta.
  if (!email) {
    // A Apple deixa esconder o e-mail, mas sempre manda **algum** endereço de
    // relay. Chegar aqui sem nenhum significa que não há como identificar a
    // pessoa nem como falar com ela.
    return {
      tipo: "recusado",
      status: 400,
      corpo: { error: `Your ${nomeDoProvedor} account did not share an email address` },
    };
  }

  const tenant = await resolveJoinTenant(opts?.tenantSlug?.trim() || null);
  if (!tenant) {
    return {
      tipo: "recusado",
      status: opts?.tenantSlug ? 404 : 503,
      corpo: {
        error: opts?.tenantSlug
          ? "Invalid professional code"
          : "Registration is not available",
      },
    };
  }

  const limite = await checkPatientLimit(tenant.clinicId);
  if (!limite.allowed) {
    return { tipo: "recusado", status: 403, corpo: { error: limite.message } };
  }

  const defaultOverrides = await getDefaultPatientModuleOverrides(tenant.clinicId);

  const novo = await prisma.user.create({
    data: {
      email,
      firstName: identidade.firstName,
      lastName: identidade.lastName,
      role: UserRole.PATIENT,
      isActive: true,
      // O provedor já provou o e-mail; pedir um código por e-mail depois disso
      // seria provar duas vezes a mesma coisa.
      emailVerified: new Date(),
      profileImageUrl: identidade.picture || null,
      clinicId: tenant.clinicId,
      // `consentAcceptedAt` **não** é preenchido: o consentimento clínico é um
      // ato da pessoa, e entrar por aqui não é aceitá-lo.
      ...(defaultOverrides ? { moduleOverrides: defaultOverrides } : {}),
      accounts: { create: { type: "oauth", provider, providerAccountId: sub } },
    },
    select: { id: true },
  });

  sysLog.auth(`New patient via ${nomeDoProvedor} (${origem}): ${email}`, {
    level: "INFO",
    userId: novo.id,
    userEmail: email,
    userRole: "PATIENT",
    source: "auth",
  });

  return { tipo: "ok", userId: novo.id, novo: true };
}

/**
 * Ligar um provedor a uma conta que já existe, e desligar (T-2).
 *
 * O `sub` é único por pessoa no provedor: dois `User` apontando para ele seria
 * a mesma pessoa com dois prontuários, e o login passaria a depender de qual
 * linha o banco devolvesse primeiro.
 */
export async function ligarProvedor(
  userId: string,
  identidade: IdentidadeSocial
): Promise<{ ok: true; jaEstava?: boolean } | { ok: false; status: number; corpo: Record<string, unknown> }> {
  const { provider, sub } = identidade;
  const nomeDoProvedor = provider === "google" ? "Google" : "Apple";

  const jaExiste = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId: sub } },
    select: { userId: true },
  });
  if (jaExiste) {
    if (jaExiste.userId === userId) return { ok: true, jaEstava: true };
    return {
      ok: false,
      status: 409,
      corpo: {
        error: `This ${nomeDoProvedor} account is already connected to another BPR account.`,
        code: "provider_taken",
      },
    };
  }

  const meu = await prisma.account.findFirst({
    where: { userId, provider },
    select: { id: true },
  });
  if (meu) {
    return {
      ok: false,
      status: 409,
      corpo: {
        error: `Your account is already connected to a different ${nomeDoProvedor} account. Disconnect it first.`,
        code: "already_linked_other",
      },
    };
  }

  const eu = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, role: true, firstName: true, lastName: true },
  });
  if (!eu) return { ok: false, status: 401, corpo: { error: "Unauthorised" } };

  await prisma.account.create({
    data: { userId, type: "oauth", provider, providerAccountId: sub },
  });

  // O vínculo vai para o log de auditoria: quem não fez isto precisa poder
  // descobrir que aconteceu, e quando.
  logAudit({
    userId,
    userEmail: eu.email,
    userRole: eu.role,
    userName: `${eu.firstName} ${eu.lastName}`,
    action: `${provider.toUpperCase()}_LINKED`,
    entity: "Account",
    entityId: userId,
    description: `${eu.firstName} ${eu.lastName} connected ${nomeDoProvedor} sign-in`,
    // O e-mail do provedor, não o `sub`: o `sub` não diz nada a quem lê o log,
    // e o e-mail é o que permite reconhecer "isto não fui eu".
    metadata: { providerEmail: identidade.email },
  });

  return { ok: true };
}

export async function desligarProvedor(
  userId: string,
  provider: "google" | "apple"
): Promise<{ ok: true; nadaAFazer?: boolean } | { ok: false; status: number; corpo: Record<string, unknown> }> {
  const eu = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, role: true, firstName: true, lastName: true, password: true },
  });
  if (!eu) return { ok: false, status: 401, corpo: { error: "Unauthorised" } };

  const outros = await prisma.account.count({ where: { userId, provider: { not: provider } } });
  if (!eu.password && outros === 0) {
    // Desligar aqui deixaria a pessoa sem **nenhuma** forma de entrar. A saída
    // vai na mesma frase, senão ela é só uma porta fechada.
    return {
      ok: false,
      status: 409,
      corpo: {
        error:
          "Set a password first — otherwise disconnecting this would leave you with no way to sign in.",
        code: "no_password",
      },
    };
  }

  const apagadas = await prisma.account.deleteMany({ where: { userId, provider } });
  if (apagadas.count === 0) return { ok: true, nadaAFazer: true };

  logAudit({
    userId,
    userEmail: eu.email,
    userRole: eu.role,
    userName: `${eu.firstName} ${eu.lastName}`,
    action: `${provider.toUpperCase()}_UNLINKED`,
    entity: "Account",
    entityId: userId,
    description: `${eu.firstName} ${eu.lastName} disconnected ${provider === "google" ? "Google" : "Apple"} sign-in`,
  });

  return { ok: true };
}
