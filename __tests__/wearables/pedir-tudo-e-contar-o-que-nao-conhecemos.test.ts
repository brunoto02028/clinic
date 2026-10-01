/**
 * @jest-environment node
 *
 * Pedimos todos os tipos de medida, e contamos os que não sabemos nomear
 * (099 T-7).
 *
 * A chamada `getmeas` aceita um parâmetro `meastypes` com a lista do que se
 * quer. Nós mandávamos quatro números — frequência, SpO2, temperatura corporal
 * e de pele — e recebíamos exatamente esses quatro.
 *
 * **O defeito é que um tipo não pedido não dá erro.** A API devolve menos, em
 * silêncio, e o código parece estar a funcionar. Foi assim que o VO2 máx, a
 * frequência respiratória e os intervalos de ECG ficaram de fora durante meses
 * sem que nada ficasse vermelho — o mesmo tipo de ausência que a classe
 * `/15` do Tailwind, que nunca era gerada e nunca avisava.
 *
 * Agora a chamada não manda `meastypes`, e o que chegar com um número que não
 * conhecemos é **contado em vez de descartado**. É assim que se descobre o que
 * um aparelho produz: perguntando-lhe, não procurando o número na documentação
 * — os tipos de ECG do ScanWatch 2 são recentes demais para estarem nos
 * clientes abertos que consultei.
 */

const chamadas: Array<{ path: string; body: Record<string, string> }> = [];

jest.mock("@/lib/withings", () => ({
  withingsRawCall: jest.fn(async (path: string, body: Record<string, string>) => {
    chamadas.push({ path, body });
    return {
      measuregrps: [
        {
          // Um grupo com um tipo conhecido e dois que não conhecemos.
          date: 1790000000,
          grpid: 111,
          measures: [
            { type: 11, value: 62, unit: 0 }, // frequência cardíaca
            { type: 137, value: 398, unit: 0 }, // intervalo de ECG — sem nome ainda
            { type: 139, value: 0, unit: 0 }, // fibrilhação por PPG — sem nome ainda
          ],
        },
        {
          // Um grupo **só** com tipos desconhecidos: não pode ser descartado.
          date: 1790003600,
          grpid: 222,
          measures: [{ type: 135, value: 92, unit: 0 }],
        },
        {
          // Um grupo vazio continua a ser descartado.
          date: 1790007200,
          grpid: 333,
          measures: [],
        },
      ],
    };
  }),
}));

import { withingsVitals, MEASTYPE } from "@/lib/withings-vitals";

describe("a chamada pede tudo", () => {
  beforeEach(() => {
    chamadas.length = 0;
  });

  it("**não manda `meastypes`** — pedir uma lista é receber só ela", () => {
    return withingsVitals("token", new Date("2026-09-01")).then(() => {
      expect(chamadas).toHaveLength(1);
      expect(chamadas[0].path).toBe("/measure");
      expect(chamadas[0].body.action).toBe("getmeas");
      expect(Object.keys(chamadas[0].body)).not.toContain("meastypes");
    });
  });

  it("continua a pedir medições reais, não objetivos do utilizador", async () => {
    await withingsVitals("token", new Date("2026-09-01"));
    expect(chamadas[0].body.category).toBe("1");
  });
});

describe("o que chega sem nome é contado, não deitado fora", () => {
  it("**um tipo desconhecido é guardado pelo seu número**", async () => {
    const vitais = await withingsVitals("token", new Date("2026-09-01"));
    const comFc = vitais.find((v) => v.measureId === "111");
    expect(comFc).toBeDefined();
    expect(comFc!.heartRate).toBe(62);
    expect(comFc!.naoNomeados).toEqual({ 137: 398, 139: 0 });
  });

  it("**um grupo só com tipos desconhecidos não é descartado**", async () => {
    // É o defeito que isto fecha: descartar o grupo por não reconhecer os seus
    // números era garantir que nunca descobriríamos que ele existe.
    const vitais = await withingsVitals("token", new Date("2026-09-01"));
    const soDesconhecido = vitais.find((v) => v.measureId === "222");
    expect(soDesconhecido).toBeDefined();
    expect(soDesconhecido!.naoNomeados).toEqual({ 135: 92 });
    expect(soDesconhecido!.heartRate).toBeUndefined();
  });

  it("um grupo sem medida nenhuma continua a ser descartado", async () => {
    const vitais = await withingsVitals("token", new Date("2026-09-01"));
    expect(vitais.find((v) => v.measureId === "333")).toBeUndefined();
  });

  it("um valor zero é um valor, não uma ausência", async () => {
    // `139: 0` é "sem fibrilhação detetada" — informação. Um `if (valor)` em
    // vez de `!== undefined` tê-lo-ia perdido.
    const vitais = await withingsVitals("token", new Date("2026-09-01"));
    expect(vitais.find((v) => v.measureId === "111")!.naoNomeados![139]).toBe(0);
  });
});

describe("a tabela de tipos conhecidos", () => {
  it("tem o VO2 máx, que é o que faltava e estava documentado", () => {
    expect(MEASTYPE.VO2_MAX).toBe(123);
  });

  it("os números conhecidos não se repetem", () => {
    const vs = Object.values(MEASTYPE);
    expect(vs).toHaveLength(new Set(vs).size);
  });
});
