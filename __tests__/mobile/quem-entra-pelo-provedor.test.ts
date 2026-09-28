/**
 * Quem entra pelo Google ou pela Apple, e quem não entra (097 T-1/T-2).
 *
 * ## Por que este teste é de comportamento, e não de leitura de código
 *
 * `lib/social-signin.ts` é a peça que decide se uma pessoa recebe uma sessão
 * do prontuário de outra. Uma asserção sobre o texto do arquivo garante que a
 * linha está escrita; só rodar a função garante que ela **faz efeito** — que
 * a recusa vem antes da emissão, que o `sub` é a chave e não o e-mail, e que
 * o `User` e o `Account` nascem juntos.
 */

const banco = {
  users: [] as any[],
  accounts: [] as any[],
};

let proximoId = 1;

const prisma = {
  account: {
    findUnique: jest.fn(async ({ where }: any) => {
      const { provider, providerAccountId } = where.provider_providerAccountId;
      return (
        banco.accounts.find(
          (a) => a.provider === provider && a.providerAccountId === providerAccountId
        ) ?? null
      );
    }),
    findFirst: jest.fn(async ({ where }: any) =>
      banco.accounts.find((a) => a.userId === where.userId && a.provider === where.provider) ?? null
    ),
    findMany: jest.fn(async ({ where }: any) =>
      banco.accounts.filter((a) => a.userId === where.userId)
    ),
    create: jest.fn(async ({ data }: any) => {
      banco.accounts.push({ ...data });
      return data;
    }),
    count: jest.fn(async ({ where }: any) =>
      banco.accounts.filter(
        (a) => a.userId === where.userId && a.provider !== where.provider?.not
      ).length
    ),
    deleteMany: jest.fn(async ({ where }: any) => {
      const antes = banco.accounts.length;
      banco.accounts = banco.accounts.filter(
        (a) => !(a.userId === where.userId && a.provider === where.provider)
      );
      return { count: antes - banco.accounts.length };
    }),
  },
  user: {
    findUnique: jest.fn(async ({ where }: any) =>
      banco.users.find((u) => (where.id ? u.id === where.id : u.email === where.email)) ?? null
    ),
    create: jest.fn(async ({ data }: any) => {
      const u = { ...data, id: `u${proximoId++}` };
      delete u.accounts;
      banco.users.push(u);
      if (data.accounts?.create) {
        banco.accounts.push({ userId: u.id, ...data.accounts.create });
      }
      return u;
    }),
  },
};

// O `jest.mock` é içado para antes do `const prisma`, então o getter existe
// para adiar a leitura até a hora em que o código realmente usa o cliente.
jest.mock("@/lib/db", () => ({
  get prisma() {
    return prisma;
  },
}));
jest.mock("@/lib/join-tenant", () => ({
  resolveJoinTenant: jest.fn(async (slug?: string | null) =>
    slug && slug !== "bpr" ? null : { clinicId: "c1", name: "BPR", slug: "bpr", type: "CLINIC" }
  ),
}));
jest.mock("@/lib/tenant-limits", () => ({
  checkPatientLimit: jest.fn(async () => ({ allowed: true })),
}));
jest.mock("@/lib/patient-defaults", () => ({
  getDefaultPatientModuleOverrides: jest.fn(async () => null),
}));
const logAudit = jest.fn();
jest.mock("@/lib/system-logger", () => ({
  logAudit: (...a: unknown[]) => logAudit(...a),
  sysLog: { auth: jest.fn() },
}));

import {
  entrarOuCriarComIdentidade,
  ligarProvedor,
  desligarProvedor,
} from "@/lib/social-signin";

const ana = {
  provider: "google" as const,
  sub: "104729",
  email: "ana@example.com",
  firstName: "Ana",
  lastName: "Lívia",
};

function paciente(extra: Record<string, unknown> = {}) {
  const u = {
    id: `u${proximoId++}`,
    email: "ana@example.com",
    firstName: "Ana",
    lastName: "Lívia",
    role: "PATIENT",
    isActive: true,
    managedById: null,
    password: "$2a$hash",
    ...extra,
  };
  banco.users.push(u);
  return u;
}

beforeEach(() => {
  banco.users = [];
  banco.accounts = [];
  proximoId = 1;
  logAudit.mockClear();
});

describe("a conta nova", () => {
  it("nasce paciente, com o provedor já ligado, numa escrita só", async () => {
    const r = await entrarOuCriarComIdentidade(ana);
    expect(r).toMatchObject({ tipo: "ok", novo: true });

    const u = banco.users[0];
    expect(u.role).toBe("PATIENT");
    expect(u.clinicId).toBe("c1");
    expect(u.emailVerified).toBeInstanceOf(Date);

    // Em duas escritas, uma falha no meio deixaria um `User` sem provedor
    // ligado — e a tentativa seguinte cairia no 409 contra ela mesma.
    expect(banco.accounts).toEqual([
      { userId: u.id, type: "oauth", provider: "google", providerAccountId: "104729" },
    ]);
  });

  it("**e não aceita o consentimento clínico por ninguém**", async () => {
    // Entrar pelo Google não é aceitar termo nenhum. Quem nunca aceitou cai no
    // mesmo portão de hoje.
    await entrarOuCriarComIdentidade(ana);
    expect(banco.users[0].consentAcceptedAt).toBeUndefined();
  });

  it("um código de profissional desconhecido não cria conta em lugar nenhum", async () => {
    const r = await entrarOuCriarComIdentidade(ana, { tenantSlug: "nao-existe" });
    expect(r).toMatchObject({ tipo: "recusado", status: 404 });
    expect(banco.users).toHaveLength(0);
  });
});

describe("a segunda entrada", () => {
  it("acha a pessoa pelo `sub`, **mesmo que o e-mail dela tenha mudado**", async () => {
    await entrarOuCriarComIdentidade(ana);
    const id = banco.users[0].id;
    banco.users[0].email = "ana.nova@example.com";

    const r = await entrarOuCriarComIdentidade(ana);
    expect(r).toEqual({ tipo: "ok", userId: id, novo: false });
    expect(banco.users).toHaveLength(1);
  });

  it("e registra o login no log de auditoria", async () => {
    await entrarOuCriarComIdentidade(ana);
    logAudit.mockClear();
    await entrarOuCriarComIdentidade(ana);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "LOGIN_SUCCESS" })
    );
  });
});

describe("quem é recusado", () => {
  it("**conta gerida não entra — nem com o provedor ligado**", async () => {
    // A criança não tem credencial própria. A recusa existe no login por senha
    // e no `signIn` da web; sem ela aqui, esta seria a porta sem tranca.
    const u = paciente({ managedById: "mae1" });
    banco.accounts.push({
      userId: u.id,
      type: "oauth",
      provider: "google",
      providerAccountId: "104729",
    });

    const r = await entrarOuCriarComIdentidade(ana);
    expect(r).toEqual({
      tipo: "recusado",
      status: 401,
      // A frase genérica de propósito: dizer "esta conta é gerida"
      // confirmaria, a quem estivesse tentando, que ela existe.
      corpo: { error: "Invalid email or password" },
    });
  });

  it("conta desativada também não", async () => {
    const u = paciente({ isActive: false });
    banco.accounts.push({
      userId: u.id,
      type: "oauth",
      provider: "google",
      providerAccountId: "104729",
    });
    expect(await entrarOuCriarComIdentidade(ana)).toMatchObject({ status: 401 });
  });

  it("conta da clínica é recusada na porta, com o caminho no texto", async () => {
    const u = paciente({ role: "THERAPIST" });
    banco.accounts.push({
      userId: u.id,
      type: "oauth",
      provider: "google",
      providerAccountId: "104729",
    });
    const r: any = await entrarOuCriarComIdentidade(ana);
    expect(r.status).toBe(403);
    expect(r.corpo.code).toBe("patient_app_only");
  });

  it("**já existe conta com esse e-mail, sem Google ligado: 409, não uma sessão**", async () => {
    // O e-mail sozinho não prova que é a mesma pessoa, e num prontuário
    // clínico entrar na conta errada é o pior erro possível.
    paciente();
    const r: any = await entrarOuCriarComIdentidade(ana);
    expect(r.status).toBe(409);
    expect(r.corpo.code).toBe("account_exists");
    expect(r.corpo.hasPassword).toBe(true);
    expect(banco.accounts).toHaveLength(0);
  });

  it("e, quando ela nunca teve senha, o 409 diz isso", async () => {
    // Senão "entre com a sua senha" é um beco sem saída: a conta nasceu pela
    // clínica e nunca teve uma.
    paciente({ password: null });
    const r: any = await entrarOuCriarComIdentidade(ana);
    expect(r.corpo.hasPassword).toBe(false);
  });

  it("uma conta gerida com aquele e-mail não vira 409 — vira a recusa genérica", async () => {
    // O 409 diria a um estranho que existe conta com aquele endereço.
    paciente({ managedById: "mae1" });
    expect(await entrarOuCriarComIdentidade(ana)).toMatchObject({
      status: 401,
      corpo: { error: "Invalid email or password" },
    });
  });
});

describe("ligar e desligar", () => {
  it("o vínculo nasce depois da senha, e vai para o log de auditoria", async () => {
    const u = paciente();
    expect(await ligarProvedor(u.id, ana)).toEqual({ ok: true });
    expect(banco.accounts).toHaveLength(1);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "GOOGLE_LINKED", metadata: { providerEmail: ana.email } })
    );
  });

  it("ligar de novo o mesmo provedor não duplica nada", async () => {
    const u = paciente();
    await ligarProvedor(u.id, ana);
    expect(await ligarProvedor(u.id, ana)).toEqual({ ok: true, jaEstava: true });
    expect(banco.accounts).toHaveLength(1);
  });

  it("**o mesmo Google não pode apontar para duas contas**", async () => {
    // Seria a mesma pessoa com dois prontuários, e o login passaria a depender
    // de qual linha o banco devolvesse primeiro.
    const a = paciente();
    const b = paciente({ email: "outra@example.com" });
    await ligarProvedor(a.id, ana);
    const r: any = await ligarProvedor(b.id, ana);
    expect(r.status).toBe(409);
    expect(r.corpo.code).toBe("provider_taken");
  });

  it("desligar deixa quem tem senha entrar pela senha", async () => {
    const u = paciente();
    await ligarProvedor(u.id, ana);
    expect(await desligarProvedor(u.id, "google")).toEqual({ ok: true });
    expect(banco.accounts).toHaveLength(0);
  });

  it("**e é recusado quando é a única forma de entrar que sobrou**", async () => {
    // Quem entrou pelo Google e nunca definiu senha ficaria trancado do lado
    // de fora da própria conta.
    const u = paciente({ password: null });
    await ligarProvedor(u.id, ana);
    const r: any = await desligarProvedor(u.id, "google");
    expect(r.ok).toBe(false);
    expect(r.corpo.code).toBe("no_password");
    expect(banco.accounts).toHaveLength(1);
  });

  it("mas quem tem Apple **e** Google pode soltar um dos dois sem senha", async () => {
    const u = paciente({ password: null });
    await ligarProvedor(u.id, ana);
    await ligarProvedor(u.id, { ...ana, provider: "apple", sub: "001.abc" });
    expect(await desligarProvedor(u.id, "google")).toEqual({ ok: true });
    expect(banco.accounts.map((a) => a.provider)).toEqual(["apple"]);
  });
});
