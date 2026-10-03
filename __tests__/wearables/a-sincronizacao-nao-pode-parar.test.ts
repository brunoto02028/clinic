/**
 * @jest-environment node
 *
 * A sincronização não pode parar (121 T-1 a T-3).
 *
 * ## O pedido
 *
 * > *"Nao pode parar de sincronizar jamais"* — Bruno, com três telas: a aba
 * > Saúde a mostrar o sono de ontem como se fosse normal, e a Activity a dizer
 * > **"27 days without a reading"**.
 *
 * ## A causa
 *
 * A Withings troca o refresh token a cada uso — é de **uso único**. O
 * `withingsAccessToken` recebia um retrato da ligação, renovava e gravava o
 * novo par, **sem trava nenhuma**. Quatro caminhos o chamam: o cron, o webhook,
 * o puxar-a-tela e a sondagem. Dois ao mesmo tempo fazem dois refreshes com o
 * mesmo token, e o segundo faz a Withings invalidar **a cadeia inteira**.
 *
 * Depois disso nenhuma repetição ajuda: só reautorizar. E o webhook engolia a
 * falha com um `console.error`, logo a tela do paciente não mostrava pendência
 * nenhuma — um mês de buracos com cara de *"não mediu"*.
 */

const chamadasDeRefresh: string[] = [];

jest.mock("@/lib/crypto-at-rest", () => ({
  seal: (v: string) => v,
  unseal: (v: string | null) => v,
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    wearableConnection: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import { withingsAccessToken } from "@/lib/withings";

/**
 * O banco, como um objecto — para a trava poder ser medida pelo que **de facto**
 * acontece quando dois pedidos correm ao mesmo tempo.
 */
let linha: any;

const montarBanco = () => {
  (prisma as any).wearableConnection.findUnique.mockImplementation(async () => ({ ...linha }));

  (prisma as any).wearableConnection.updateMany.mockImplementation(async ({ where, data }: any) => {
    /*
     * **Três operações diferentes passam por aqui**, e o mock tem de as
     * distinguir pelo que elas escrevem — senão mede a coisa errada. Foi o que
     * me aconteceu: a limpeza do estado também tem `where.OR`, e o mock leu-a
     * como uma tentativa de tomar a trava.
     */
    if ("needsReauthAt" in data) {
      Object.assign(linha, data);
      return { count: 1 };
    }
    /* Libertar a trava. */
    if (data.refreshLockedAt === null) {
      linha.refreshLockedAt = null;
      return { count: 1 };
    }
    /* Tomar a trava: só se ela estiver livre ou velha. */
    const livre =
      linha.refreshLockedAt === null ||
      (where.OR?.[1]?.refreshLockedAt?.lt &&
        linha.refreshLockedAt < where.OR[1].refreshLockedAt.lt);
    if (!livre) return { count: 0 };
    linha.refreshLockedAt = data.refreshLockedAt;
    return { count: 1 };
  });

  (prisma as any).wearableConnection.update.mockImplementation(async ({ data }: any) => {
    Object.assign(linha, data);
    return { id: linha.id };
  });
};

/** A Withings: o refresh token é de uso único, como lá. */
const comWithings = (opts: { atrasoMs?: number } = {}) => {
  let valido = "refresh-1";
  let n = 0;
  (global as any).fetch = jest.fn(async (_url: string, init: any) => {
    const corpo = new URLSearchParams(String(init.body));
    const usado = corpo.get("refresh_token")!;
    chamadasDeRefresh.push(usado);
    if (opts.atrasoMs) await new Promise((r) => setTimeout(r, opts.atrasoMs));
    if (usado !== valido) {
      /* **Exactamente o que matou a ligação do Bruno.** */
      return {
        ok: true,
        json: async () => ({ status: 503, error: "Invalid Params: invalid refresh_token" }),
      };
    }
    n += 1;
    valido = `refresh-${n + 1}`;
    return {
      ok: true,
      json: async () => ({
        status: 0,
        body: {
          access_token: `access-${n}`,
          refresh_token: valido,
          expires_in: 3600,
          userid: "u1",
        },
      }),
    };
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  chamadasDeRefresh.length = 0;
  jest.spyOn(console, "error").mockImplementation(() => {});
  linha = {
    id: "conn1",
    accessToken: "access-velho",
    refreshToken: "refresh-1",
    /* Já expirado: força a renovação. */
    tokenExpiresAt: new Date(Date.now() - 60_000),
    refreshLockedAt: null,
    lastSyncError: null,
    needsReauthAt: null,
    status: "CONNECTED",
  };
  montarBanco();
  comWithings();
});
afterEach(() => {
  delete (global as any).fetch;
  (console.error as any).mockRestore?.();
});

const retrato = () => ({
  id: linha.id,
  accessToken: linha.accessToken,
  refreshToken: linha.refreshToken,
  tokenExpiresAt: linha.tokenExpiresAt,
});

describe("o token de uso único é gasto uma vez só", () => {
  it("**dois pedidos ao mesmo tempo fazem UM refresh**", async () => {
    /*
     * O defeito: os dois chamavam `withingsRefresh("refresh-1")`, o segundo
     * levava `invalid refresh_token`, e a Withings invalidava a cadeia inteira.
     * Não há API de volta — a ligação morre até alguém reconectar.
     */
    comWithings({ atrasoMs: 30 });
    const [a, b] = await Promise.all([
      withingsAccessToken(retrato()),
      withingsAccessToken(retrato()),
    ]);

    expect(chamadasDeRefresh).toEqual(["refresh-1"]);
    expect(a).toBe("access-1");
    /* O segundo não renova: lê o que o primeiro gravou. */
    expect(b).toBe("access-1");
  });

  it("**quatro ao mesmo tempo também** — é o cron, o webhook, a tela e a sondagem", async () => {
    comWithings({ atrasoMs: 30 });
    const todos = await Promise.all(
      Array.from({ length: 4 }, () => withingsAccessToken(retrato()))
    );
    expect(chamadasDeRefresh).toEqual(["refresh-1"]);
    expect(new Set(todos)).toEqual(new Set(["access-1"]));
  });

  it("**e a ligação não fica marcada como precisando de reautorização**", async () => {
    comWithings({ atrasoMs: 30 });
    await Promise.all([withingsAccessToken(retrato()), withingsAccessToken(retrato())]);
    expect(linha.needsReauthAt).toBeNull();
    expect(linha.status).toBe("CONNECTED");
  });

  it("um pedido sozinho renova normalmente", async () => {
    const t = await withingsAccessToken(retrato());
    expect(t).toBe("access-1");
    expect(chamadasDeRefresh).toEqual(["refresh-1"]);
    /* E larga a trava, senão o próximo pedido fica preso. */
    expect(linha.refreshLockedAt).toBeNull();
  });

  it("**um token que ainda serve não renova nada**", async () => {
    linha.tokenExpiresAt = new Date(Date.now() + 3600_000);
    const t = await withingsAccessToken(retrato());
    expect(t).toBe("access-velho");
    expect(chamadasDeRefresh).toEqual([]);
  });

  it("**uma trava velha não tranca para sempre**", async () => {
    /* Um processo que morra a meio não pode matar a ligação. */
    linha.refreshLockedAt = new Date(Date.now() - 120_000);
    const t = await withingsAccessToken(retrato());
    expect(t).toBe("access-1");
  });
});

describe("quando a cadeia morre mesmo, a ligação grita", () => {
  it("**`invalid refresh_token` marca `needsReauthAt` e põe a ligação em ERROR**", async () => {
    /*
     * Era isto que faltava: nada marcava nada. A ligação ficava `CONNECTED` e
     * morta, e a tela do paciente lia `CONNECTED`.
     */
    linha.refreshToken = "refresh-queimado";
    await expect(withingsAccessToken(retrato())).rejects.toThrow(/invalid refresh_token/i);

    expect(linha.needsReauthAt).toBeInstanceOf(Date);
    expect(linha.status).toBe("ERROR");
    expect(String(linha.lastSyncError)).toMatch(/invalid refresh_token/i);
  });

  it("**e sem refresh token nenhum também**", async () => {
    linha.refreshToken = null;
    await expect(withingsAccessToken(retrato())).rejects.toThrow(/reauthoris/i);
  });

  it("**uma renovação que corre bem apaga o estado**", async () => {
    /* Um aviso que fica depois de resolvido mente tanto quanto um que falta. */
    linha.needsReauthAt = new Date("2026-09-05T00:00:00Z");
    linha.lastSyncError = "Invalid Params: invalid refresh_token";
    linha.status = "ERROR";

    await withingsAccessToken(retrato());

    expect(linha.needsReauthAt).toBeNull();
    expect(linha.lastSyncError).toBeNull();
  });

  it("**a trava é libertada mesmo quando o refresh falha**", async () => {
    /* Senão uma falha tranca a ligação por 30 segundos a cada tentativa. */
    linha.refreshToken = "refresh-queimado";
    await expect(withingsAccessToken(retrato())).rejects.toThrow();
    expect(linha.refreshLockedAt).toBeNull();
  });
});

describe("o log diz quem pediu (121 T-5)", () => {
  /**
   * A T-1 fecha a corrida que eu **consigo explicar**. O que não se sabe é se
   * era a única causa: a ligação esteve morta ~27 dias e a única prova é uma
   * linha a dizer `invalid refresh_token`, **sem dizer quem chamou**.
   *
   * Se voltar a parar, é esta linha que diz qual caminho estava a renovar.
   */
  let linhas: string[];
  beforeEach(() => {
    linhas = [];
    jest.spyOn(console, "log").mockImplementation((...a: any[]) => {
      linhas.push(a.map(String).join(" "));
    });
  });
  afterEach(() => {
    (console.log as any).mockRestore?.();
  });

  it("**a renovação diz a origem**", async () => {
    await withingsAccessToken(retrato(), "webhook");
    expect(linhas.join(String.fromCharCode(10))).toMatch(/webhook renova conn1/);
  });

  it("**e a espera pela trava também** — é o número que diz se a corrida era esta", async () => {
    comWithings({ atrasoMs: 40 });
    await Promise.all([
      withingsAccessToken(retrato(), "cron"),
      withingsAccessToken(retrato(), "webhook"),
    ]);
    const tudo = linhas.join(String.fromCharCode(10));
    /* Um renovou, o outro esperou — e os dois dizem quem são. */
    expect(tudo).toMatch(/esperou a trava/);
    expect(tudo).toMatch(/(cron|webhook) renova/);
  });

  it("**os cinco caminhos têm nome** — nenhum fica a `?`", () => {
    /*
     * O log de produção de 03/10 apanhou o que faltava:
     *
     * ```
     * [withings/token] ? renova cmufr3e...
     * [withings/token] cron renova cmufr3e...
     * ```
     *
     * Duas renovações da mesma passagem, e a primeira sem nome — era o caminho
     * das assinaturas, que ficou de fora quando os outros se identificaram.
     */
    const { readFileSync } = require("node:fs");
    const { join } = require("node:path");
    const ler = (...p: string[]) =>
      readFileSync(join(__dirname, "..", "..", ...p), "utf8");

    const chamadores: Array<[string[], string]> = [
      [["lib", "withings-subscriptions.ts"], "assinatura"],
      [["app", "api", "cron", "wearables-probe", "route.ts"], "sondagem"],
      [["app", "api", "wearables", "disconnect", "route.ts"], "desligar"],
    ];
    for (const [caminho, nome] of chamadores) {
      expect(ler(...caminho)).toContain(`withingsAccessToken(`);
      expect(ler(...caminho)).toContain(`"${nome}"`);
    }
    /* E os que passam pela ingestão declaram-se nela. */
    expect(ler("lib", "wearables-sync-run.ts")).toContain('origem: "cron"');
    expect(ler("app", "api", "wearables", "sync", "route.ts")).toContain('origem: "manual"');
    expect(ler("app", "api", "wearables", "withings", "webhook", "route.ts")).toContain('origem: "webhook"');
  });

  it("sem origem declarada, diz `?` em vez de mentir", async () => {
    await withingsAccessToken(retrato());
    expect(linhas.join(String.fromCharCode(10))).toMatch(/\? renova conn1/);
  });
});

describe("o que é fatal, e o que não é", () => {
  const { ehFatal } = require("@/lib/withings-estado-da-ligacao");

  it("**as mensagens que só a pessoa resolve**", () => {
    for (const m of [
      "Withings status 503: Invalid Params: invalid refresh_token",
      "invalid_grant",
      "Unauthorized",
      "Withings connection needs to be reauthorised",
    ]) {
      expect(ehFatal(m)).toBe(true);
    }
  });

  it("**e as que passam sozinhas não marcam nada**", () => {
    /*
     * Marcar um 601 como "precisa reconectar" mandaria o paciente reautorizar
     * por causa de duas chamadas iguais em dez segundos — que se resolve na
     * rodada seguinte.
     */
    for (const m of [
      "Withings status 601: Same arguments in less than 10 seconds",
      "fetch failed",
      "Withings HTTP 500",
      "",
      null,
      undefined,
    ]) {
      expect(ehFatal(m)).toBe(false);
    }
  });
});
