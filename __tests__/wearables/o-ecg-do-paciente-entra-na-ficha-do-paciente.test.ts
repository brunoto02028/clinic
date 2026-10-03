/**
 * @jest-environment node
 *
 * O ECG medido num paciente entra **na ficha do paciente** (122 T-2).
 *
 * ## A metade que faltava
 *
 * A 122 T-1 ensinou a ligação **pessoal** a não ficar com o que foi medido
 * noutra pessoa: um ECG gravado dentro de uma janela da clínica deixou de cair
 * no prontuário do dono do aparelho.
 *
 * Só que a ligação da clínica lia `["bp"]` e mais nada. O ECG desviado não era
 * guardado por **ninguém** — e "em sítio nenhum" é melhor do que "na pessoa
 * errada", mas continua a ser a ausência silenciosa que estas três atividades
 * existem para matar.
 *
 * ## A régua é uma só, lida pelos dois lados
 *
 * `aJanelaDecide` é a mesma função nas duas pontas, e isso é o que torna a
 * coisa correcta: a pessoal **cala-se exactamente** quando a da clínica
 * **fala**. Duas cópias da condição divergiriam por um `!`, e cada lado do `!`
 * tem nome: a gravação guardada **duas vezes**, ou **nenhuma**.
 */

import {
  aJanelaDecide,
  ehDeQuemFoiMedido,
  entraPelaAtribuicao,
} from "@/lib/withings-routing";

const QUANDO = new Date("2026-10-04T09:01:00.000Z");

const janela = (extra: Record<string, unknown> = {}) => ({
  id: "s1",
  status: "OPEN",
  patientId: "pac1",
  openedById: "staff1",
  context: "PRE_SESSION",
  openedAt: new Date("2026-10-04T09:00:00.000Z"),
  expiresAt: new Date("2026-10-04T09:03:00.000Z"),
  ...extra,
});

/** As janelas que o banco devolve nesta passagem do teste. */
const janelasNoBanco: { rows: any[]; erro?: boolean } = { rows: [] };
/** A gravação que a Withings devolve. */
const doProvedor: { recs: any[] } = { recs: [] };

const upsertEcg = jest.fn(async () => ({ id: "ecg1" }));
const jaGravada = jest.fn(async () => null as any);
const auditoria = jest.fn(async () => undefined);

jest.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: jest.fn(async () => ({ clinicId: "c1" })) },
    wearableConnection: {
      update: jest.fn(async () => ({})),
      findFirst: jest.fn(async () => null),
      findUnique: jest.fn(async () => null),
      findMany: jest.fn(async () => []),
    },
    wearableDataPoint: {
      findFirst: jest.fn(async () => null),
      create: jest.fn(async () => ({ id: "x" })),
      update: jest.fn(async () => ({ id: "x" })),
    },
    bloodPressureReading: { findFirst: jest.fn(async () => null), create: jest.fn(async () => ({})) },
    unassignedMeasurement: {
      findFirst: jest.fn(async () => null),
      create: jest.fn(async () => ({ id: "u1" })),
    },
    clinicMeasurementSession: {
      findMany: async () => {
        /* Um banco que responde com erro, e não com lista vazia. */
        if (janelasNoBanco.erro) throw new Error("P2024: timed out fetching a connection from the pool");
        return janelasNoBanco.rows;
      },
      update: jest.fn(async () => ({})),
      updateMany: jest.fn(async () => ({ count: 0 })),
    },
    ecgRecording: {
      upsert: (...a: any[]) => upsertEcg(...(a as [])),
      update: jest.fn(async () => ({})),
      /* "já estava guardada?" — o que faz a auditoria acontecer uma vez só. */
      findFirst: (...a: any[]) => jaGravada(...(a as [])),
    },
  },
}));

jest.mock("@/lib/system-logger", () => ({ logAudit: (...a: any[]) => auditoria(...(a as [])) }));

jest.mock("@/lib/withings", () => ({
  withingsAccessToken: jest.fn(async () => "tok"),
  withingsBloodPressure: jest.fn(async () => []),
  withingsActivity: jest.fn(async () => []),
  withingsSleep: jest.fn(async () => []),
}));

jest.mock("@/lib/withings-vitals", () => ({
  withingsVitals: jest.fn(async () => []),
  vitalsByDay: jest.fn(() => []),
  withingsEcg: jest.fn(async () => doProvedor.recs),
}));

/* O traçado já está guardado: este teste é sobre **de quem** é a gravação. */
jest.mock("@/lib/ecg-tem-sinal", () => ({ temTracadoPorGravacao: jest.fn(async () => true) }));
jest.mock("@/lib/withings-series", () => ({
  intradayDoDia: jest.fn(async () => null),
  hipnogramaDaNoite: jest.fn(async () => null),
  treinosDoPeriodo: jest.fn(async () => []),
  sinalDoEcg: jest.fn(async () => ({ amostras: [], bruto: {} })),
}));

import { ingestWithings } from "@/lib/withings-ingest";

const ligacao = (extra: Record<string, unknown>) =>
  ({
    id: "conn1",
    provider: "WITHINGS",
    accessToken: "a",
    refreshToken: "r",
    providerUserId: "w1",
    expiresAt: new Date(Date.now() + 3600_000),
    ...extra,
  }) as any;

const daClinica = ligacao({ isClinicDevice: true, clinicId: "c1" });
const pessoal = ligacao({ isClinicDevice: false, clinicId: "c1" });

const gravacao = (extra: Record<string, unknown> = {}) => ({
  recordedAt: QUANDO,
  heartRate: 62,
  afibClassification: 0,
  signalId: "sig1",
  deviceId: "dev1",
  deviceModel: null,
  ...extra,
});

let logs: string[] = [];
beforeEach(() => {
  janelasNoBanco.rows = [];
  janelasNoBanco.erro = false;
  doProvedor.recs = [];
  upsertEcg.mockClear();
  jaGravada.mockClear();
  jaGravada.mockImplementation(async () => null);
  auditoria.mockClear();
  logs = [];
  jest.spyOn(console, "log").mockImplementation((...a: any[]) => {
    logs.push(a.map(String).join(" "));
  });
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  (console.log as any).mockRestore?.();
  (console.error as any).mockRestore?.();
});

/** O utilizador em cujo prontuário a gravação foi escrita. */
const escritoEm = () => upsertEcg.mock.calls.map((c: any) => c[0].create.userId);

describe("a janela nomeia o dono da gravação", () => {
  it("**dentro da janela, o ECG é do paciente** — e não de quem autorizou a conta", async () => {
    janelasNoBanco.rows = [janela()];
    doProvedor.recs = [gravacao()];

    await ingestWithings("staff1", daClinica, { kinds: ["ecg"] });

    expect(upsertEcg).toHaveBeenCalledTimes(1);
    expect(escritoEm()).toEqual(["pac1"]);
    /* E a chave de deduplicação aponta ao mesmo prontuário, não a dois. */
    expect((upsertEcg.mock.calls[0] as any)[0].where.userId_provider_recordedAt.userId).toBe("pac1");
  });

  it("**sem janela, nada é escrito** — e o log diz quantas ficaram sem dono", async () => {
    /*
     * Numa conta partilhada é a ligação pessoal que a guarda, e é por isso que
     * aqui não se escreve. Numa conta dedicada à clínica não há ninguém, e esta
     * linha de log é a única coisa que torna a perda visível até existir uma
     * caixa de entrada para o que não é pressão (122 T-4).
     */
    doProvedor.recs = [gravacao()];

    await ingestWithings("staff1", daClinica, { kinds: ["ecg"] });

    expect(upsertEcg).not.toHaveBeenCalled();
    expect(logs.join("\n")).toMatch(/ECG nao atribuidos: 1 sem janela/);
  });

  it("**duas janelas a cobrir o mesmo instante não viram palpite**", async () => {
    janelasNoBanco.rows = [janela(), janela({ id: "s2", patientId: "pac2" })];
    doProvedor.recs = [gravacao()];

    await ingestWithings("staff1", daClinica, { kinds: ["ecg"] });

    expect(upsertEcg).not.toHaveBeenCalled();
    expect(logs.join("\n")).toMatch(/1 com duas janelas/);
  });

  it("**o relógio do dono não é do paciente**, mesmo com a janela aberta", async () => {
    /*
     * O `94` é o ScanWatch 2, no pulso do dono. Sem isto, um ECG do relógio
     * dele gravado enquanto media um paciente com o BeamO era escrito na ficha
     * do paciente — a troca exacta que esta tarefa existe para impedir, só na
     * direcção contrária.
     */
    janelasNoBanco.rows = [janela()];
    doProvedor.recs = [gravacao({ deviceModel: 94 })];

    await ingestWithings("staff1", daClinica, { kinds: ["ecg"] });

    expect(upsertEcg).not.toHaveBeenCalled();
    expect(logs.join("\n")).toMatch(/1 de pulso \(do dono\)/);
  });

  it("**uma ligação pessoal comum não mudou nada**", async () => {
    janelasNoBanco.rows = [janela()];
    doProvedor.recs = [gravacao()];

    await ingestWithings("u1", pessoal, { kinds: ["ecg"] });

    /* Sem conta partilhada, a janela não lhe toca: a gravação é de quem sincroniza. */
    expect(escritoEm()).toEqual(["u1"]);
  });
});

describe("os achados do review de 03/10", () => {
  it("**a janela que já recebeu a pressão ainda recebe o ECG** (G1)", async () => {
    /*
     * O defeito mais caro dos dois críticos, e o uso **normal** do BeamO: a
     * pressão e o ECG nos mesmos três minutos. O caminho da pressão corre
     * primeiro e marca a janela `COMPLETED`; com `COMPLETED` fora da lista, o
     * ECG do paciente era deitado fora — e a passagem seguinte encontrava a
     * janela na mesma `COMPLETED`, logo não havia segunda oportunidade.
     *
     * `COMPLETED` quer dizer *"já recebi a minha leitura de pressão"*. Sobre um
     * ECG não diz nada.
     */
    janelasNoBanco.rows = [janela({ status: "COMPLETED" })];
    doProvedor.recs = [gravacao()];

    await ingestWithings("staff1", daClinica, { kinds: ["ecg"] });

    expect(escritoEm()).toEqual(["pac1"]);
  });

  it("**uma janela cancelada continua a não receber nada**", async () => {
    /* `CANCELLED` é o terapeuta a dizer *não atribua isto*. */
    janelasNoBanco.rows = [janela({ status: "CANCELLED" })];
    doProvedor.recs = [gravacao()];

    await ingestWithings("staff1", daClinica, { kinds: ["ecg"] });

    expect(upsertEcg).not.toHaveBeenCalled();
  });

  it("**a consulta das janelas a falhar não vira 'não havia janela'** (G2)", async () => {
    /*
     * Era `.catch(() => [])`. Lista vazia é indistinguível de *"ninguém estava
     * a ser medido"*, e sem janela a regra diz "é do dono": um timeout do pool
     * escrevia a medição de um paciente no prontuário do dono, sem uma linha em
     * lado nenhum. Agora a dúvida trava a escrita **e** aparece nos números.
     */
    janelasNoBanco.erro = true;
    doProvedor.recs = [gravacao()];

    const r = await ingestWithings("staff1", daClinica, { kinds: ["ecg"] });

    expect(upsertEcg).not.toHaveBeenCalled();
    expect(r.falhas).toContain("janelas-da-clinica");
    expect(r.ecgNaoAtribuidos).toBe(1);
  });

  it("**e do lado pessoal, o mesmo: nada vai para o dono**", async () => {
    /*
     * Este é o lado que **escreve**, e por isso o lado onde o silêncio custava
     * caro. A ligação pessoal de uma conta partilhada (`findFirst` devolve uma
     * ligação de clínica) com as janelas por ler não guarda nada em ninguém.
     */
    const { prisma } = require("@/lib/db");
    prisma.wearableConnection.findFirst.mockResolvedValueOnce({ id: "clin" });
    janelasNoBanco.erro = true;
    doProvedor.recs = [gravacao()];

    const r = await ingestWithings("u1", pessoal, { kinds: ["ecg"] });

    expect(upsertEcg).not.toHaveBeenCalled();
    expect(r.falhas).toContain("janelas-da-clinica");
  });

  it("**o relógio fora de janela conta como 'de pulso', não como 'sem janela'** (G6)", async () => {
    /*
     * O contador `semJanela` existe para gritar *"ninguém reclamou esta
     * medição"*. O ECG do relógio do dono fora de janela — o caso **normal**
     * numa conta de clínica — enchia-o de ruído benigno.
     */
    doProvedor.recs = [gravacao({ deviceModel: 94 })];

    await ingestWithings("staff1", daClinica, { kinds: ["ecg"] });

    expect(logs.join("\n")).toMatch(/0 sem janela, 0 com duas janelas, 1 de pulso/);
  });

  it("**o que a Withings devolveu conta, mesmo sem ser guardado** (A3)", async () => {
    /*
     * "Veio uma e não foi guardada" e "não veio nada" são notícias opostas, e
     * era a segunda que a tela dizia nos dois casos — o mesmo defeito que o
     * review de 27/09 apanhou na pressão.
     */
    doProvedor.recs = [gravacao(), gravacao({ recordedAt: new Date("2026-10-04T10:00:00.000Z") })];

    const r = await ingestWithings("staff1", daClinica, { kinds: ["ecg"] });

    expect(r.ecgRead).toBe(2);
    expect(r.ecgRecords).toBe(0);
    expect(r.ecgNaoAtribuidos).toBe(2);
  });

  it("**a auditoria não se repete em cada passagem** (G8)", async () => {
    /*
     * O `upsert` é idempotente; o `logAudit` não era. Enquanto o `since`
     * alcançasse a gravação, cada passagem do cron escrevia outra linha — e um
     * rasto repetido N vezes responde pior a "por que caminho isto chegou".
     */
    janelasNoBanco.rows = [janela()];
    doProvedor.recs = [gravacao()];
    /* A segunda passagem encontra a gravação já lá. */
    jaGravada.mockImplementation(async () => ({ id: "ecg1" }));

    await ingestWithings("staff1", daClinica, { kinds: ["ecg"] });

    expect(escritoEm()).toEqual(["pac1"]);
    expect(auditoria).not.toHaveBeenCalled();
  });

  it("quem não partilha a conta não paga a consulta das janelas", async () => {
    /* Uma consulta por passagem para quem não tem janelas seria desperdício. */
    janelasNoBanco.erro = true;
    doProvedor.recs = [gravacao()];

    const r = await ingestWithings("u1", pessoal, { kinds: ["ecg"] });

    expect(escritoEm()).toEqual(["u1"]);
    expect(r.falhas).toEqual([]);
  });
});

describe("a atribuição deixa rasto", () => {
  it("**quem abriu a janela fica no registo de auditoria**", async () => {
    janelasNoBanco.rows = [janela()];
    doProvedor.recs = [gravacao()];

    await ingestWithings("staff1", daClinica, { kinds: ["ecg"] });

    expect(auditoria).toHaveBeenCalledTimes(1);
    const entrada = (auditoria.mock.calls[0] as any)[0];
    expect(entrada.entity).toBe("EcgRecording");
    expect(entrada.action).toBe("CLINIC_MEASUREMENT_ASSIGN");
    expect(entrada.userId).toBe("staff1");
    expect(entrada.metadata.patientId).toBe("pac1");
    expect(entrada.metadata.sessionId).toBe("s1");
  });

  it("**e uma gravação do próprio paciente não gera auditoria nenhuma**", async () => {
    doProvedor.recs = [gravacao()];
    await ingestWithings("u1", pessoal, { kinds: ["ecg"] });
    expect(auditoria).not.toHaveBeenCalled();
  });
});

describe("a régua é uma só, e os dois lados encaixam", () => {
  /**
   * A propriedade que prova que nada é escrito duas vezes nem zero: numa conta
   * partilhada, **a pessoal cala-se exactamente quando a da clínica fala**.
   */
  const casos = [0, 1, 2].flatMap((janelasQueCobrem) =>
    [null, 94, 99].map((modeloDoAparelho) => ({ janelasQueCobrem, modeloDoAparelho }))
  );

  it("**o que a clínica atribui, a pessoal desviou** — nunca escrito duas vezes", () => {
    /*
     * A implicação, e não a equivalência. Com **duas** janelas a cobrir a mesma
     * medição a da clínica recusa-se a escolher e a pessoal continua calada: a
     * gravação fica por atribuir, contada e dita no log. O que não pode é ser
     * escrita nas duas pontas.
     */
    for (const c of casos) {
      const pessoalDesvia = ehDeQuemFoiMedido({
        ehDaClinica: false,
        contaTambemEhDaClinica: true,
        ...c,
      });
      const clinicaAtribui = entraPelaAtribuicao({ ehDaClinica: true, ...c });
      if (clinicaAtribui) expect({ ...c, pessoalDesvia }).toEqual({ ...c, pessoalDesvia: true });
    }
  });

  it("**e a diferença entre os dois lados é só a ambiguidade**", () => {
    /* O buraco é conhecido, é um só, e tem contador: `naoAtribuidos.ambiguos`. */
    const soDiferem = casos.filter(
      (c) =>
        ehDeQuemFoiMedido({ ehDaClinica: false, contaTambemEhDaClinica: true, ...c }) !==
        entraPelaAtribuicao({ ehDaClinica: true, ...c })
    );
    expect(soDiferem).toEqual([
      { janelasQueCobrem: 2, modeloDoAparelho: null },
      { janelasQueCobrem: 2, modeloDoAparelho: 99 },
    ]);
  });

  it("**e as duas leem a mesma função**", () => {
    for (const c of casos) {
      const umaSo = c.janelasQueCobrem === 1;
      expect(entraPelaAtribuicao({ ehDaClinica: true, ...c })).toBe(aJanelaDecide(c) && umaSo);
    }
  });

  it("uma ligação pessoal nunca atribui — ela não vê janelas", () => {
    expect(entraPelaAtribuicao({ ehDaClinica: false, janelasQueCobrem: 1 })).toBe(false);
  });
});
