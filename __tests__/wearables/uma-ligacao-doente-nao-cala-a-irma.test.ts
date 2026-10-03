/**
 * @jest-environment node
 *
 * Uma ligação doente não cala a irmã sã (121 T-7 e T-8).
 *
 * ## O achado, lido no log de produção de 03/10/2026
 *
 * ```
 * [withings/webhook] descartada: conexão ERROR userid=49651552 appli=16
 * [withings/webhook] descartada: conexão ERROR userid=49651552 appli=44
 * ```
 *
 * A Withings estava a empurrar passos e sono para a conta do Bruno, e nós
 * **deitávamos fora cada empurrão** — com a ligação pessoal dele a funcionar
 * perfeitamente. O que estava em `ERROR` era a outra ligação da mesma conta: o
 * manguito da clínica, com o token morto à espera de reautorização.
 *
 * O webhook escolhia **uma** ligação (`findFirst`, a da clínica à frente) e, se
 * essa não estivesse `CONNECTED`, descartava a notificação inteira. O tempo
 * real desapareceu para ele e só a rede de quinze minutos o segurava — que é
 * precisamente a diferença entre *"a app atualiza quando eu meço"* e *"a app
 * atualiza um quarto de hora depois"*.
 *
 * ## Porque processar as duas é seguro **agora**
 *
 * Porque a 122 T-1/T-2 pôs uma régua só a decidir de quem é cada medição: a
 * ligação pessoal cala-se exactamente quando a da clínica atribui. Antes dessa
 * régua, duas ligações a processar o mesmo empurrão era o defeito que a 092
 * corrigiu com a ordenação. Agora é o conserto.
 *
 * ## E o estado que nunca mais saía (T-8)
 *
 * `registarFalhaDaLigacao` marcava `status: "ERROR"` numa falha fatal e
 * `limparEstadoDaLigacao` limpava tudo **menos isso**. Como o webhook só aceita
 * `CONNECTED`, uma falha fatal transitória desligava o tempo real **de vez**,
 * sem nada na tela a explicar o atraso.
 */

const ingerir = jest.fn(async () => ({
  bloodPressure: 1,
  bloodPressureRead: 1,
  activityDays: 1,
  sleepNights: 0,
  vitalsDays: 0,
  ecgRecords: 0,
  intradayDays: 0,
  hypnogramNights: 0,
  workouts: 0,
  falhas: [],
}));
const registarFalha = jest.fn(async () => undefined);
const registoDoSistema = jest.fn(async () => undefined);
const atualizarMuitas = jest.fn(async () => ({ count: 1 }));

/** As ligações que o banco tem para esta conta Withings. */
const noBanco: { rows: any[] } = { rows: [] };

jest.mock("@/lib/db", () => ({
  prisma: {
    wearableConnection: {
      findMany: jest.fn(async () => noBanco.rows),
      updateMany: (...a: any[]) => atualizarMuitas(...(a as [])),
    },
  },
}));
jest.mock("@/lib/withings-ingest", () => ({ ingestWithings: (...a: any[]) => ingerir(...(a as [])) }));
jest.mock("@/lib/system-logger", () => ({ logSystem: (...a: any[]) => registoDoSistema(...(a as [])) }));
jest.mock("@/lib/withings-estado-da-ligacao", () => ({
  registarFalhaDaLigacao: (...a: any[]) => registarFalha(...(a as [])),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/wearables/withings/webhook/route";

const ligacao = (extra: Record<string, unknown>) => ({
  id: "c1",
  userId: "u1",
  accessToken: "a",
  refreshToken: "r",
  tokenExpiresAt: new Date(Date.now() + 3600_000),
  status: "CONNECTED",
  isClinicDevice: false,
  clinicId: "cl1",
  providerUserId: "49651552",
  ...extra,
});

const empurrao = (appli: number) =>
  POST(
    new NextRequest("https://bpr.clinic/api/wearables/withings/webhook", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: `userid=49651552&appli=${appli}&startdate=1759500000&enddate=1759500600`,
    })
  );

/** Os `userId` para quem a ingestão foi chamada, nesta ordem. */
const ingeridos = () => ingerir.mock.calls.map((c: any) => c[1].id);

let logs: string[] = [];
beforeEach(() => {
  noBanco.rows = [];
  ingerir.mockClear();
  registarFalha.mockClear();
  registoDoSistema.mockClear();
  atualizarMuitas.mockClear();
  logs = [];
  const apanha = (...a: any[]) => {
    logs.push(a.map(String).join(" "));
  };
  jest.spyOn(console, "log").mockImplementation(apanha);
  jest.spyOn(console, "warn").mockImplementation(apanha);
  jest.spyOn(console, "error").mockImplementation(apanha);
});
afterEach(() => {
  (console.log as any).mockRestore?.();
  (console.warn as any).mockRestore?.();
  (console.error as any).mockRestore?.();
});

describe("o empurrão chega a quem o pode receber", () => {
  it("**a ligação da clínica em `ERROR` não cala a pessoal**", async () => {
    /* Exactamente o estado de produção em 03/10/2026. */
    noBanco.rows = [
      ligacao({ id: "clinica", isClinicDevice: true, status: "ERROR" }),
      ligacao({ id: "pessoal", isClinicDevice: false, status: "CONNECTED" }),
    ];

    const r = await empurrao(16);

    expect(ingeridos()).toEqual(["pessoal"]);
    expect(await r.json()).toEqual({ status: 0 });
  });

  it("**as duas sãs recebem as duas** — a régua da 122 garante que nada entra duas vezes", async () => {
    noBanco.rows = [
      ligacao({ id: "clinica", isClinicDevice: true }),
      ligacao({ id: "pessoal", isClinicDevice: false }),
    ];

    await empurrao(4);

    /* A da clínica primeiro: é ela que atribui a pressão. */
    expect(ingeridos()).toEqual(["clinica", "pessoal"]);
  });

  it("**uma a falhar não impede a outra**, e a falha fica registada nela", async () => {
    noBanco.rows = [
      ligacao({ id: "clinica", isClinicDevice: true }),
      ligacao({ id: "pessoal", isClinicDevice: false }),
    ];
    ingerir.mockImplementationOnce(async () => {
      throw new Error("Withings status 503: Invalid Params: invalid refresh_token");
    });

    await empurrao(4);

    expect(ingeridos()).toEqual(["clinica", "pessoal"]);
    expect(registarFalha).toHaveBeenCalledTimes(1);
    expect((registarFalha.mock.calls[0] as any)[0]).toBe("clinica");
  });

  it("**nenhuma servível → descarte, e o log diz o estado de todas**", async () => {
    noBanco.rows = [
      ligacao({ id: "clinica", isClinicDevice: true, status: "ERROR" }),
      ligacao({ id: "pessoal", status: "DISCONNECTED" }),
    ];

    await empurrao(16);

    expect(ingerir).not.toHaveBeenCalled();
    /*
     * O estado de **todas**, e não o da primeira: era isto que faltava para se
     * ver, no log, que uma ligação sã estava a ser calada por outra.
     */
    expect(logs.join("\n")).toMatch(/nenhuma ligacao servivel \(ERROR,DISCONNECTED\)/);
    const registo = (registoDoSistema.mock.calls[0] as any)[0];
    expect(registo.details.estados).toBe("ERROR,DISCONNECTED");
    expect(registo.details.esperado).toBe(false);
  });

  it("conta desconhecida continua a ser o caso **esperado**", async () => {
    /* Assinatura órfã de um paciente que se desligou: não é defeito nosso. */
    noBanco.rows = [];

    await empurrao(44);

    expect(ingerir).not.toHaveBeenCalled();
    const registo = (registoDoSistema.mock.calls[0] as any)[0];
    expect(registo.details.esperado).toBe(true);
    expect(logs.join("\n")).toMatch(/conta desconhecida/);
  });

  it("e responde sempre `status: 0` — a Withings corta quem não responde", async () => {
    noBanco.rows = [];
    const r = await empurrao(16);
    expect(await r.json()).toEqual({ status: 0 });
  });
});

describe("uma sincronização que corre bem devolve a ligação ao estado são", () => {
  it("**o `ERROR` sai, e o `status` volta a `CONNECTED`**", async () => {
    /* O módulo está mockado para o webhook; aqui quer-se a função a sério. */
    const { limparEstadoDaLigacao } = jest.requireActual("@/lib/withings-estado-da-ligacao");
    await limparEstadoDaLigacao("c1");

    const chamada = (atualizarMuitas.mock.calls[0] as any)[0];
    expect(chamada.data.status).toBe("CONNECTED");
    expect(chamada.data.needsReauthAt).toBeNull();
    expect(chamada.data.lastSyncError).toBeNull();
  });

  it("**mas uma ligação desligada não ressuscita** por uma chamada ter corrido bem", async () => {
    /* O módulo está mockado para o webhook; aqui quer-se a função a sério. */
    const { limparEstadoDaLigacao } = jest.requireActual("@/lib/withings-estado-da-ligacao");
    await limparEstadoDaLigacao("c1");

    const chamada = (atualizarMuitas.mock.calls[0] as any)[0];
    expect(chamada.where.status).toEqual({ in: ["CONNECTED", "ERROR"] });
  });
});
