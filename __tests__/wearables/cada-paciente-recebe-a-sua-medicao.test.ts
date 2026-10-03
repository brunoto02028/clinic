/**
 * @jest-environment node
 *
 * Cada paciente recebe a **sua** medição (122 T-3).
 *
 * > *"Eu quero que você teste as medições que serão direcionadas a outros
 * > pacientes."* — Bruno, 03/10/2026
 *
 * O dia da clínica não é um paciente: são vários, em sequência, no mesmo
 * aparelho. A janela de medição é a única coisa que diz de quem é cada medição,
 * e este arquivo exercita isso com **três pessoas** — dois pacientes e o dono do
 * aparelho — medidos no mesmo quarto de hora.
 *
 * É a forma de defeito mais cara que este produto tem: uma medição na ficha de
 * outra pessoa.
 */

const criadas: any[] = [];
const existentes: { rows: any[] } = { rows: [] };

jest.mock("@/lib/db", () => ({
  prisma: {
    vitalReading: {
      findFirst: jest.fn(async ({ where }: any) =>
        existentes.rows.find(
          (r) => r.patientId === where.patientId && r.withingsMeasureId === where.withingsMeasureId
        ) ?? null
      ),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `v${criadas.length + 1}`, ...data };
        criadas.push(row);
        existentes.rows.push(row);
        return { id: row.id };
      }),
    },
  },
}));
jest.mock("@/lib/system-logger", () => ({ logAudit: jest.fn(async () => undefined) }));

import {
  atribuirVitalDaClinica,
  valorPlausivel,
  type JanelaParaVitais,
} from "@/lib/clinic-vitals";

/** Uma janela de três minutos, como a tela a abre. */
const janela = (
  id: string,
  patientId: string,
  inicio: string,
  extra: Partial<JanelaParaVitais> = {}
): JanelaParaVitais => ({
  id,
  status: "OPEN",
  patientId,
  openedById: "staff1",
  context: "PRE_SESSION",
  openedAt: new Date(inicio),
  expiresAt: new Date(new Date(inicio).getTime() + 3 * 60_000),
  ...extra,
});

/* Ana às 09:00, Bruno-paciente às 09:10, Carla às 09:20. */
const ANA = janela("s-ana", "pac-ana", "2026-10-04T09:00:00.000Z");
const CARLA = janela("s-carla", "pac-carla", "2026-10-04T09:20:00.000Z");

const medicao = (quando: string, extra: Record<string, unknown> = {}) => ({
  measuredAt: new Date(quando),
  measureId: `g-${quando}`,
  spo2: 97,
  heartRate: 70,
  ...extra,
});

beforeEach(() => {
  criadas.length = 0;
  existentes.rows = [];
});

describe("três pessoas, um aparelho, uma manhã", () => {
  it("**cada medição vai ao paciente da sua janela**", async () => {
    const janelas = [ANA, CARLA];

    const a = await atribuirVitalDaClinica("c1", janelas, medicao("2026-10-04T09:01:00.000Z"));
    const c = await atribuirVitalDaClinica("c1", janelas, medicao("2026-10-04T09:21:00.000Z"));

    expect(a).toMatchObject({ kind: "assigned", patientId: "pac-ana" });
    expect(c).toMatchObject({ kind: "assigned", patientId: "pac-carla" });
    expect(criadas.map((r) => r.patientId)).toEqual(["pac-ana", "pac-carla"]);
  });

  it("**a medição do dono, entre as duas, não entra em nenhum deles**", async () => {
    /*
     * Ele mede-se a si mesmo às 09:10, fora de qualquer janela. Essa entra pela
     * ligação **pessoal**, no prontuário dele, e não tem nada que ver com a
     * clínica.
     */
    const r = await atribuirVitalDaClinica(
      "c1",
      [ANA, CARLA],
      medicao("2026-10-04T09:10:00.000Z")
    );

    expect(r).toEqual({ kind: "skipped", reason: "sem-janela" });
    expect(criadas).toHaveLength(0);
  });

  it("**a janela da Ana não apanha a medição da Carla**, nem ao contrário", async () => {
    await atribuirVitalDaClinica("c1", [ANA], medicao("2026-10-04T09:21:00.000Z"));
    expect(criadas).toHaveLength(0);

    await atribuirVitalDaClinica("c1", [CARLA], medicao("2026-10-04T09:01:00.000Z"));
    expect(criadas).toHaveLength(0);
  });

  it("**duas janelas sobrepostas não escolhem por sorteio**", async () => {
    /*
     * Duas fichas abertas ao mesmo tempo no mesmo aparelho. É o estado em que é
     * mais certo que a medição **não** é do dono — e aquele em que escrever
     * seria escrever na pessoa errada metade das vezes.
     */
    const sobreposta = janela("s-outra", "pac-outro", "2026-10-04T09:00:30.000Z");

    const r = await atribuirVitalDaClinica(
      "c1",
      [ANA, sobreposta],
      medicao("2026-10-04T09:01:00.000Z")
    );

    expect(r).toEqual({ kind: "skipped", reason: "ambiguo" });
    expect(criadas).toHaveLength(0);
  });

  it("**a frequência cardíaca sozinha não vira medição de ninguém**", async () => {
    /*
     * O relógio do dono, no pulso dele, enquanto ele mede a Ana. Sem isto, a FC
     * **dele** entrava no prontuário **dela**.
     */
    const r = await atribuirVitalDaClinica(
      "c1",
      [ANA],
      { measuredAt: new Date("2026-10-04T09:01:30.000Z"), measureId: "g-fc", heartRate: 58 }
    );

    expect(r).toEqual({ kind: "skipped", reason: "so-passivo" });
    expect(criadas).toHaveLength(0);
  });
});

describe("os achados do review (03/10)", () => {
  it("**a temperatura não entra no prontuário com dezassete dígitos**", async () => {
    /*
     * A Withings manda `value: 368, unit: -1`, e `368 * 10^-1` em vírgula
     * flutuante dá **36.800000000000004**. O caminho pessoal arredonda em
     * `vitalsByDay`; este guardava o double cru e a tela imprimia-o inteiro na
     * ficha de um paciente. Provado a correr, pelo review.
     */
    await atribuirVitalDaClinica("c1", [ANA], {
      measuredAt: new Date("2026-10-04T09:01:00.000Z"),
      measureId: "g-float",
      bodyTemperature: 368 * Math.pow(10, -1),
      spo2: 966 * Math.pow(10, -1),
    });

    expect(criadas[0].temperature).toBe(36.8);
    expect(criadas[0].spo2).toBe(96.6);
  });

  it("**um SpO₂ de 0% não é escrito num prontuário**", async () => {
    /*
     * O cabeçalho de `withings-vitals.ts` diz que *"uma tela a mostrar SpO₂ 0%
     * seria uma medição que nunca aconteceu"* — e nada recusava um zero que a
     * API mandasse de facto, de uma oximetria abortada.
     *
     * Não é inventar: é recusar escrever o que não pode ser uma medição de uma
     * pessoa viva. E não é silencioso — tem motivo próprio.
     */
    const r = await atribuirVitalDaClinica("c1", [ANA], {
      measuredAt: new Date("2026-10-04T09:01:00.000Z"),
      measureId: "g-zero",
      spo2: 0,
    });

    expect(r).toEqual({ kind: "skipped", reason: "implausivel" });
    expect(criadas).toHaveLength(0);
  });

  it("**e uma temperatura de 3 °C também não**", async () => {
    const r = await atribuirVitalDaClinica("c1", [ANA], {
      measuredAt: new Date("2026-10-04T09:01:00.000Z"),
      measureId: "g-fria",
      bodyTemperature: 3,
    });
    expect(r).toEqual({ kind: "skipped", reason: "implausivel" });
  });

  it("**mas a febre entra** — a faixa é o que um corpo pode ter, não faixa clínica", () => {
    /*
     * 41,5 °C é grave e é exactamente o que não pode ser descartado. A faixa é
     * larga de propósito: faixa de referência é leitura de médico, não nossa.
     */
    expect(valorPlausivel({ bodyTemperature: 41.5 })).toBe(true);
    expect(valorPlausivel({ spo2: 82 })).toBe(true);
    expect(valorPlausivel({ spo2: 100 })).toBe(true);
    expect(valorPlausivel({ spo2: 101 })).toBe(false);
  });

  it("e um grupo sem medição nenhuma nem chega a ser perguntado", () => {
    expect(valorPlausivel({ heartRate: 58 })).toBe(true);
  });
});

describe("o que fica guardado é o que foi medido", () => {
  it("**o valor, a hora, o fuso, quem abriu a janela e qual janela**", async () => {
    await atribuirVitalDaClinica("c1", [ANA], {
      measuredAt: new Date("2026-10-04T09:01:00.000Z"),
      measureId: "g1",
      timezone: "Europe/London",
      spo2: 96,
      bodyTemperature: 36.8,
      heartRate: 71.4,
    });

    expect(criadas[0]).toMatchObject({
      patientId: "pac-ana",
      clinicId: "c1",
      recordedById: "staff1",
      spo2: 96,
      temperature: 36.8,
      /* Arredondada: a coluna é inteira, e 71,4 bpm não é meio batimento. */
      heartRate: 71,
      timezone: "Europe/London",
      withingsMeasureId: "g1",
      source: "CLINIC_DEVICE",
      context: "PRE_SESSION",
      sessionId: "s-ana",
    });
  });

  it("**a temperatura corporal ganha à da pele**", async () => {
    await atribuirVitalDaClinica("c1", [ANA], {
      measuredAt: new Date("2026-10-04T09:01:00.000Z"),
      measureId: "g2",
      bodyTemperature: 36.9,
      skinTemperature: 33.2,
    });
    expect(criadas[0].temperature).toBe(36.9);
  });

  it("**a mesma medição duas vezes é uma linha só**", async () => {
    /* O webhook e a varredura de quinze minutos trazem ambos a mesma. */
    const m = medicao("2026-10-04T09:01:00.000Z");
    const um = await atribuirVitalDaClinica("c1", [ANA], m);
    const dois = await atribuirVitalDaClinica("c1", [ANA], m);

    expect(um.kind).toBe("assigned");
    expect(dois).toEqual({ kind: "duplicate" });
    expect(criadas).toHaveLength(1);
  });

  it("**sem id da Withings não se escreve** — num aparelho partilhado um id inventado colide", async () => {
    const r = await atribuirVitalDaClinica("c1", [ANA], {
      measuredAt: new Date("2026-10-04T09:01:00.000Z"),
      measureId: null,
      spo2: 97,
    });
    expect(r.kind).toBe("skipped");
    expect(criadas).toHaveLength(0);
  });

  it("**uma janela cancelada não recebe nada**", async () => {
    const r = await atribuirVitalDaClinica(
      "c1",
      [janela("s-x", "pac-x", "2026-10-04T09:00:00.000Z", { status: "CANCELLED" })],
      medicao("2026-10-04T09:01:00.000Z")
    );
    expect(r).toEqual({ kind: "skipped", reason: "sem-janela" });
  });

  it("**uma janela já fechada pela pressão ainda recebe os vitais**", async () => {
    /*
     * O BeamO mede os dois nos mesmos três minutos, e a pressão corre primeiro.
     * É o crítico G1 do review, do lado dos vitais.
     */
    const r = await atribuirVitalDaClinica(
      "c1",
      [janela("s-y", "pac-y", "2026-10-04T09:00:00.000Z", { status: "COMPLETED" })],
      medicao("2026-10-04T09:01:00.000Z")
    );
    expect(r).toMatchObject({ kind: "assigned", patientId: "pac-y" });
  });
});
