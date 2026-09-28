/**
 * @jest-environment node
 *
 * A sessão de uso do app (085, T-1).
 *
 * A pergunta do Bruno era "quanto tempo elas estão usando", e não tinha
 * resposta. O que se guarda é a sessão — começo, último sinal, fim — e não o
 * toque.
 *
 * O Prisma aqui é um **falso que guarda linhas** e aplica os mesmos filtros da
 * consulta real. Foi a lição da 084: um `count` cravado não distingue
 * "reaproveitou" de "criou a segunda", e foi assim que dois defeitos de cupom
 * passaram por testes verdes.
 */

const linhas: any[] = [];
let seq = 0;

function casa(l: any, w: any): boolean {
  if (w.userId && l.userId !== w.userId) return false;
  if (w.endedAt === null && l.endedAt !== null) return false;
  if (w.lastSeenAt?.gte && l.lastSeenAt < w.lastSeenAt.gte) return false;
  if (w.lastSeenAt?.lt && !(l.lastSeenAt < w.lastSeenAt.lt)) return false;
  if (w.startedAt?.gte && l.startedAt < w.startedAt.gte) return false;
  if (w.startedAt?.lte && l.startedAt > w.startedAt.lte) return false;
  return true;
}

jest.mock("@/lib/db", () => ({
  prisma: {
    appSession: {
      findFirst: jest.fn(async ({ where }: any) => linhas.filter((l) => casa(l, where)).at(-1) ?? null),
      findMany: jest.fn(async ({ where }: any) => linhas.filter((l) => casa(l, where))),
      create: jest.fn(async ({ data }: any) => {
        const l = { id: `s${++seq}`, endedAt: null, ...data };
        linhas.push(l);
        return l;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const l = linhas.find((x) => x.id === where.id)!;
        Object.assign(l, data);
        return l;
      }),
    },
  },
}));

import {
  registrarSinal,
  fecharMudas,
  duracaoDaSessao,
  tempoDeUsoNoPeriodo,
  JANELA_SESSAO_MS,
  INTERVALO_SINAL_MS,
} from "../../lib/app-usage";

const T0 = new Date("2026-09-26T10:00:00.000Z");
const mais = (min: number) => new Date(T0.getTime() + min * 60 * 1000);

const sinal = (over: Record<string, unknown> = {}) =>
  registrarSinal({ userId: "p1", clinicId: "clinic-A", now: T0, ...over } as any);

beforeEach(() => {
  linhas.length = 0;
  seq = 0;
  jest.clearAllMocks();
});

describe("a janela", () => {
  it("o silêncio que encerra é maior que o intervalo do sinal, com folga", () => {
    // Uma janela menor que o intervalo fecharia a sessão de quem está usando.
    expect(JANELA_SESSAO_MS).toBeGreaterThan(INTERVALO_SINAL_MS * 3);
    expect(JANELA_SESSAO_MS).toBe(30 * 60 * 1000);
    expect(INTERVALO_SINAL_MS).toBe(3 * 60 * 1000);
  });
});

describe("dois sinais próximos são uma sessão", () => {
  it("o segundo sinal em 3 minutos não cria outra linha", async () => {
    const a = await sinal();
    const b = await sinal({ now: mais(3) });
    expect(a?.nova).toBe(true);
    expect(b?.nova).toBe(false);
    expect(linhas).toHaveLength(1);
    expect(b?.sessionId).toBe(a?.sessionId);
  });

  it("e o `lastSeenAt` anda com ele", async () => {
    await sinal();
    await sinal({ now: mais(3) });
    expect(linhas[0].lastSeenAt).toEqual(mais(3));
    expect(linhas[0].startedAt).toEqual(T0);
  });

  it("vinte sinais seguidos continuam sendo uma sessão", async () => {
    for (let i = 0; i <= 20; i++) await sinal({ now: mais(i * 3) });
    expect(linhas).toHaveLength(1);
    expect(duracaoDaSessao(linhas[0])).toBe(60 * 60 * 1000);
  });
});

describe("o silêncio encerra", () => {
  it("40 minutos depois é uma sessão nova", async () => {
    await sinal();
    const b = await sinal({ now: mais(40) });
    expect(b?.nova).toBe(true);
    expect(linhas).toHaveLength(2);
  });

  it("e a anterior é fechada no ÚLTIMO SINAL, não no agora", async () => {
    // Carimbar o agora diria que a pessoa ficou com o app aberto a noite toda.
    await sinal();
    await sinal({ now: mais(6) });
    await sinal({ now: mais(90) });
    const antiga = linhas[0];
    expect(antiga.endedAt).toEqual(mais(6));
    expect(duracaoDaSessao(antiga)).toBe(6 * 60 * 1000);
  });

  it("exatamente na janela ainda é a mesma sessão", async () => {
    await sinal();
    const b = await sinal({ now: new Date(T0.getTime() + JANELA_SESSAO_MS) });
    expect(b?.nova).toBe(false);
    expect(linhas).toHaveLength(1);
  });

  it("`fecharMudas` não toca no que ainda está vivo", async () => {
    await sinal();
    const fechadas = await fecharMudas("p1", mais(5));
    expect(fechadas).toBe(0);
    expect(linhas[0].endedAt).toBeNull();
  });
});

describe("o que é gravado", () => {
  it("a pessoa e a clínica vêm de quem chamou, e ficam na linha", async () => {
    await sinal({ platform: "ios", appVersion: "1.0.0" });
    expect(linhas[0]).toMatchObject({
      userId: "p1",
      clinicId: "clinic-A",
      platform: "ios",
      appVersion: "1.0.0",
    });
  });

  it("conta sem clínica grava `null`, não quebra", async () => {
    await sinal({ clinicId: null });
    expect(linhas[0].clinicId).toBeNull();
  });

  it("a versão do app é atualizada no sinal seguinte — um update chega no meio da sessão", async () => {
    await sinal({ appVersion: "1.0.0" });
    await sinal({ now: mais(3), appVersion: "1.0.1" });
    expect(linhas).toHaveLength(1);
    expect(linhas[0].appVersion).toBe("1.0.1");
  });
});

describe("a soma", () => {
  it("duas sessões no período somam as duas", async () => {
    await sinal();
    await sinal({ now: mais(10) });
    await sinal({ now: mais(60) });
    await sinal({ now: mais(75) });
    const r = await tempoDeUsoNoPeriodo("p1", T0, mais(120));
    expect(r.sessoes).toBe(2);
    expect(r.ms).toBe(25 * 60 * 1000);
  });

  it("sessão ainda aberta conta até o último sinal", () => {
    expect(duracaoDaSessao({ startedAt: T0, lastSeenAt: mais(7), endedAt: null })).toBe(7 * 60 * 1000);
  });

  it("nunca devolve tempo negativo", () => {
    expect(duracaoDaSessao({ startedAt: mais(10), lastSeenAt: T0, endedAt: null })).toBe(0);
  });
});

describe("um sinal que falha não atrapalha quem está usando o app", () => {
  it("devolve null em vez de lançar", async () => {
    const { prisma } = require("@/lib/db");
    prisma.appSession.findFirst.mockRejectedValueOnce(new Error("banco fora"));
    const erro = jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(sinal()).resolves.toBeNull();
    erro.mockRestore();
  });
});

describe("a rota", () => {
  const fs = require("fs");
  const path = require("path");
  const rota = fs.readFileSync(
    path.join(__dirname, "..", "..", "app", "api", "mobile", "session", "ping", "route.ts"),
    "utf8"
  );

  it("a pessoa vem do token, nunca do corpo", () => {
    expect(rota).toContain("getMobileActor");
    expect(rota).toMatch(/userId: actor\.userId/);
    expect(rota).not.toMatch(/corpo\.userId|body\.userId/);
  });

  it("a clínica também", () => {
    expect(rota).toMatch(/clinicId: actor\.clinicId/);
  });

  it("responde 200 mesmo quando não consegue gravar", () => {
    // Erro aqui faria o app tentar de novo, ou mostrar algo — e isto é do nosso
    // interesse, não do interesse de quem está usando o app.
    expect(rota).toMatch(/return corsJson\(\{ ok: false \}, \{ status: 200 \}\)/);
  });
});

describe("o app só sinaliza em primeiro plano", () => {
  const fs = require("fs");
  const path = require("path");
  const lib = fs.readFileSync(
    path.join(__dirname, "..", "..", "mobile", "src", "lib", "session-ping.ts"),
    "utf8"
  );

  it("para o timer quando sai do primeiro plano", () => {
    // Bateria é do paciente.
    expect(lib).toMatch(/if \(estado === "active"\) comecar\(\);/);
    expect(lib).toMatch(/else parar\(\);/);
    expect(lib).toMatch(/clearInterval/);
  });

  it("e limpa tudo ao desmontar", () => {
    expect(lib).toMatch(/return \(\) => \{[\s\S]{0,80}parar\(\);[\s\S]{0,60}sub\.remove\(\)/);
  });

  it("falha de rede é engolida", () => {
    expect(lib).toMatch(/catch \{[\s\S]{0,80}\}/);
  });

  it("o hook é chamado antes de qualquer return condicional do layout", () => {
    const layout = fs.readFileSync(
      path.join(__dirname, "..", "..", "mobile", "app", "(app)", "_layout.tsx"),
      "utf8"
    ).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const hook = layout.indexOf("useSessionPing");
    const primeiroReturn = layout.indexOf("return (");
    expect(hook).toBeGreaterThan(-1);
    expect(hook).toBeLessThan(primeiroReturn);
  });
});
