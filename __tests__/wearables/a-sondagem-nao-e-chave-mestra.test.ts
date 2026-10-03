/**
 * @jest-environment node
 *
 * A sondagem deixa de ser chave-mestra do prontuário (120 T-2).
 *
 * ## O achado
 *
 * A rota validava `?key=` contra `CRON_SECRET || NEXTAUTH_SECRET` — o padrão de
 * 19 rotas de cron. Mas as outras **disparam trabalho**; esta devolve fases do
 * sono, VFC, FC de repouso, SpO₂ e passos de **qualquer** `?email=`, sem recorte
 * de clínica.
 *
 * Sem `CRON_SECRET` definido, a chave válida era o **segredo de assinatura de
 * sessão**, a viajar num URL: log do Coolify, log do proxy, histórico de shell,
 * e a conversa onde o `curl` foi colado.
 *
 * ## O que mudou
 *
 * Um segredo próprio, de preferência em header; uma lista de quem pode ser
 * sondado; e **fechado por omissão**, porque é o estado certo para uma porta
 * que lê o prontuário de uma pessoa nomeada.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    user: { findMany: jest.fn(async () => []) },
    wearableDataPoint: { findMany: jest.fn(async () => []) },
    wearableConnection: { findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    ecgRecording: { findMany: jest.fn(async () => []), groupBy: jest.fn(async () => []) },
  },
}));
jest.mock("@/lib/withings", () => ({ withingsAccessToken: jest.fn() }));
jest.mock("@/lib/withings-sondagem", () => ({
  sondarTudo: jest.fn(),
  tabelaDaSondagem: jest.fn(() => ""),
}));
jest.mock("@/lib/ecg-tem-sinal", () => ({ quaisTemTracado: jest.fn(async () => new Set()) }));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/cron/wearables-probe/route";
import { prisma } from "@/lib/db";
import { withingsAccessToken } from "@/lib/withings";

const SEGREDO = "segredo-proprio-da-sondagem";
const SESSAO = "segredo-que-assina-as-sessoes";
const ALVO = "paciente.de.teste@example.test";

const chamar = (
  qs: string,
  headers: Record<string, string> = {}
) =>
  POST(
    new NextRequest(`https://bpr.clinic/api/cron/wearables-probe${qs}`, {
      method: "POST",
      headers,
    })
  );

const guardado = { ...process.env };
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
  process.env.NEXTAUTH_SECRET = SESSAO;
  process.env.CRON_SECRET = "segredo-do-cron";
  process.env.WEARABLES_PROBE_SECRET = SEGREDO;
  process.env.WEARABLES_PROBE_EMAILS = ALVO;
});
afterEach(() => {
  process.env = { ...guardado };
  (console.warn as any).mockRestore?.();
  (console.log as any).mockRestore?.();
});

describe("o segredo de sessão não abre esta porta", () => {
  it("**`?key=<NEXTAUTH_SECRET>` → 401**", async () => {
    const r = await chamar(`?pontos=1&email=${encodeURIComponent(ALVO)}&key=${SESSAO}`);
    expect(r.status).toBe(401);
  });

  it("**nem o segredo do cron**, que é o de 19 outras rotas", async () => {
    const r = await chamar(
      `?pontos=1&email=${encodeURIComponent(ALVO)}&key=segredo-do-cron`
    );
    expect(r.status).toBe(401);
  });

  it("e sem o env próprio a rota recusa, dizendo qual falta", async () => {
    delete process.env.WEARABLES_PROBE_SECRET;
    const r = await chamar(`?pontos=1&email=${encodeURIComponent(ALVO)}&key=${SESSAO}`);
    expect(r.status).toBe(503);
    expect(JSON.stringify(await r.json())).toContain("WEARABLES_PROBE_SECRET");
  });

  it("**sem segredo nenhum, o banco nem é tocado**", async () => {
    await chamar(`?pontos=1&email=${encodeURIComponent(ALVO)}`);
    expect((prisma as any).user.findMany).not.toHaveBeenCalled();
  });
});

describe("o segredo certo entra — e o header é o caminho preferido", () => {
  it("**em header, sem aviso**", async () => {
    const r = await chamar(`?pontos=1&email=${encodeURIComponent(ALVO)}`, {
      "x-probe-secret": SEGREDO,
    });
    /* 404 porque a fixture não tem o utilizador — o que importa é que passou. */
    expect(r.status).not.toBe(401);
    expect(r.status).not.toBe(403);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("**em query string funciona, e avisa**", async () => {
    const r = await chamar(
      `?pontos=1&email=${encodeURIComponent(ALVO)}&key=${SEGREDO}`
    );
    expect(r.status).not.toBe(401);
    expect(console.warn).toHaveBeenCalled();
    expect(String((console.warn as jest.Mock).mock.calls[0][0])).toMatch(/query string/);
  });
});

describe("a lista de quem pode ser sondado", () => {
  it("**um e-mail fora da lista → 403**, dizendo qual env a define", async () => {
    const r = await chamar("?pontos=1&email=outra.pessoa@example.test", {
      "x-probe-secret": SEGREDO,
    });
    expect(r.status).toBe(403);
    expect(JSON.stringify(await r.json())).toContain("WEARABLES_PROBE_EMAILS");
  });

  it("**a lista vazia fecha a porta** — e não a abre", async () => {
    /* O estado por omissão de uma porta que lê o prontuário é fechada. */
    delete process.env.WEARABLES_PROBE_EMAILS;
    const r = await chamar(`?pontos=1&email=${encodeURIComponent(ALVO)}`, {
      "x-probe-secret": SEGREDO,
    });
    expect(r.status).toBe(403);
  });

  it("vários e-mails, com espaços e maiúsculas, são aceitos", async () => {
    process.env.WEARABLES_PROBE_EMAILS = ` outro@x.test , ${ALVO.toUpperCase()} `;
    const r = await chamar(`?pontos=1&email=${encodeURIComponent(ALVO)}`, {
      "x-probe-secret": SEGREDO,
    });
    expect(r.status).not.toBe(403);
  });

  it("**e um e-mail fora da lista não chega ao banco**", async () => {
    await chamar("?pontos=1&email=outra.pessoa@example.test", {
      "x-probe-secret": SEGREDO,
    });
    expect((prisma as any).user.findMany).not.toHaveBeenCalled();
  });
});

describe("o `?listar=1` fecha do mesmo lado", () => {
  /**
   * **O achado F2 do QA, e a razão de este bloco existir.**
   *
   * O ramo do `listar` estava **antes** do guarda da lista de e-mails: com a
   * `WEARABLES_PROBE_EMAILS` vazia, o `?pontos=1` dava 403 e isto dava **200
   * com 50 ligações de todas as clínicas** — domínio inteiro, primeiro nome,
   * estado e quantos ECG cada um tem.
   *
   * E não havia **nenhum** teste a tocar este ramo. Por isso a mutação passou
   * verde no QA, e por isso a minha correcção pôde desaparecer da árvore sem
   * ninguém dar conta: outro agente restaurou o ficheiro de um snapshot dele,
   * tirado antes da minha edição, e a suíte continuou verde. Um conserto sem
   * teste é um conserto que se perde.
   */
  const ligacao = (email: string, userId: string) => ({
    userId,
    status: "CONNECTED",
    isClinicDevice: false,
    lastSyncedAt: new Date("2026-10-02T06:00:00Z"),
    user: { email, firstName: "Sonda", lastName: "Q" },
  });

  it("**lista vazia → 403**, e não 200 com todas as clínicas", async () => {
    delete process.env.WEARABLES_PROBE_EMAILS;
    const r = await chamar("?listar=1", { "x-probe-secret": SEGREDO });
    expect(r.status).toBe(403);
    expect(JSON.stringify(await r.json())).toContain("WEARABLES_PROBE_EMAILS");
  });

  it("**e nem toca no banco** quando a lista está vazia", async () => {
    delete process.env.WEARABLES_PROBE_EMAILS;
    await chamar("?listar=1", { "x-probe-secret": SEGREDO });
    expect((prisma as any).wearableConnection.findMany).not.toHaveBeenCalled();
    expect((prisma as any).ecgRecording.groupBy).not.toHaveBeenCalled();
  });

  it("**com a lista, a consulta é recortada pelos e-mails dela**", async () => {
    (prisma as any).wearableConnection.findMany.mockResolvedValue([
      ligacao(ALVO, "u1"),
    ]);
    (prisma as any).ecgRecording.groupBy.mockResolvedValue([
      { userId: "u1", _count: { _all: 2 } },
    ]);

    const r = await chamar("?listar=1", { "x-probe-secret": SEGREDO });
    expect(r.status).toBe(200);

    const where = (prisma as any).wearableConnection.findMany.mock.calls[0][0].where;
    /* O recorte existe, e nomeia os e-mails da lista. */
    expect(JSON.stringify(where)).toContain(ALVO);
  });

  it("**e a contagem de ECG também** — era global, sobre todo o banco", async () => {
    (prisma as any).wearableConnection.findMany.mockResolvedValue([
      ligacao(ALVO, "u1"),
    ]);
    (prisma as any).ecgRecording.groupBy.mockResolvedValue([]);

    await chamar("?listar=1", { "x-probe-secret": SEGREDO });
    const chamada = (prisma as any).ecgRecording.groupBy.mock.calls[0][0];
    expect(chamada.where).toBeDefined();
    expect(chamada.where.userId.in).toEqual(["u1"]);
  });

  it("sem segredo, o `listar` também não responde", async () => {
    const r = await chamar("?listar=1");
    expect(r.status).toBe(401);
  });

  it("**e o `NEXTAUTH_SECRET` não o abre**", async () => {
    const r = await chamar(`?listar=1&key=${SESSAO}`);
    expect(r.status).toBe(401);
  });
});

describe("e continua a não falar com a Withings", () => {
  it("**`?pontos=1` não pede token** — os refresh tokens deles são de uso único", async () => {
    (prisma as any).user.findMany.mockResolvedValue([
      { id: "u1", email: ALVO, createdAt: new Date(), clinicId: "c1" },
    ]);
    const r = await chamar(`?pontos=1&email=${encodeURIComponent(ALVO)}`, {
      "x-probe-secret": SEGREDO,
    });
    expect(r.status).toBe(200);
    expect(withingsAccessToken).not.toHaveBeenCalled();
  });

  it("**e a conclusão do ECG não sai na resposta**", async () => {
    (prisma as any).user.findMany.mockResolvedValue([
      { id: "u1", email: ALVO, createdAt: new Date(), clinicId: "c1" },
    ]);
    /*
     * A linha **com** a conclusão, de propósito: é o estado que existe se
     * alguém a acrescentar de volta ao `select`. Com uma fixture sem ela, a
     * asserção passava verde mesmo com a rota a devolvê-la — medido por
     * mutação.
     */
    (prisma as any).ecgRecording.findMany.mockResolvedValue([
      {
        id: "e1",
        recordedAt: new Date(),
        heartRate: 63,
        signalId: "s1",
        conclusao: "fibrilacao",
      },
    ]);
    const r = await chamar(`?pontos=1&email=${encodeURIComponent(ALVO)}`, {
      "x-probe-secret": SEGREDO,
    });
    const corpo = JSON.stringify(await r.json());
    expect(corpo).not.toContain("fibrilacao");
    expect(corpo).not.toContain("conclusao");
    /* Mas diz se o traçado chegou, que é a pergunta. */
    expect(corpo).toContain("temTracado");
  });
});
