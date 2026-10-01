/**
 * @jest-environment node
 *
 * As séries do dia e da noite (099 T-7).
 *
 * Três chamadas novas, e cada uma tem um formato com a sua própria armadilha:
 *
 * **O intraday não é uma lista.** A Withings devolve um objeto com o instante
 * como **chave** — `{ "1790000000": { steps: 12 } }`. Tratá-lo como lista não dá
 * erro: devolve vazio, e a tela mostra um dia sem nada como se a pessoa não
 * tivesse andado.
 *
 * **O hipnograma traz a frequência como objeto dentro do trecho**, pelo mesmo
 * padrão. Lê-lo como número devolve `NaN`, que desenha fora do gráfico.
 *
 * **Os treinos escondem os valores em `data`**, e não no corpo do registo.
 *
 * Nada disto foi exercido contra resposta real ainda — estes testes fixam o que
 * a documentação diz, para a primeira resposta verdadeira ter contra o que ser
 * comparada em vez de ser aceite por parecer certa.
 */

const chamadas: Array<{ path: string; body: Record<string, string> }> = [];
let resposta: any = {};

jest.mock("@/lib/withings", () => ({
  withingsRawCall: jest.fn(async (path: string, body: Record<string, string>) => {
    chamadas.push({ path, body });
    return resposta;
  }),
}));

import {
  intradayDoDia,
  hipnogramaDaNoite,
  treinosDoPeriodo,
  agruparPorIntervalo,
  FASE_DO_SONO,
} from "@/lib/withings-series";

beforeEach(() => {
  chamadas.length = 0;
  resposta = {};
});

describe("a série do dia", () => {
  it("**lê o objeto com a hora na chave** — não é uma lista", () => {
    resposta = {
      series: {
        "1790000000": { steps: 12, heart_rate: 71 },
        "1790000060": { heart_rate: 74 },
        "1790000120": { steps: 30, calories: 2.5, distance: 24 },
      },
    };
    return intradayDoDia("tok", new Date(1790000000000), new Date(1790003600000)).then((p) => {
      expect(p).toHaveLength(3);
      expect(p[0]).toEqual({ t: 1790000000, steps: 12, hr: 71 });
      expect(p[1]).toEqual({ t: 1790000060, hr: 74 });
      expect(p[2]).toEqual({ t: 1790000120, steps: 30, calories: 2.5, distance: 24 });
    });
  });

  it("vem ordenada no tempo, mesmo que as chaves cheguem baralhadas", async () => {
    resposta = { series: { "1790000120": { hr: 1, heart_rate: 80 }, "1790000000": { heart_rate: 70 } } };
    const p = await intradayDoDia("tok", new Date(), new Date());
    expect(p.map((x) => x.t)).toEqual([1790000000, 1790000120]);
  });

  it("descarta um instante sem valor nenhum, e uma chave que não é número", async () => {
    resposta = { series: { "1790000000": {}, naoENumero: { heart_rate: 70 } } };
    expect(await intradayDoDia("tok", new Date(), new Date())).toEqual([]);
  });

  it("pede os campos pelo nome, e à rota certa", async () => {
    await intradayDoDia("tok", new Date(1790000000000), new Date(1790003600000));
    expect(chamadas[0].path).toBe("/v2/measure");
    expect(chamadas[0].body.action).toBe("getintradayactivity");
    expect(chamadas[0].body.data_fields).toContain("heart_rate");
    expect(chamadas[0].body.startdate).toBe("1790000000");
  });

  it("uma resposta sem `series` devolve vazio, não explode", async () => {
    resposta = { status: 0 };
    expect(await intradayDoDia("tok", new Date(), new Date())).toEqual([]);
  });
});

describe("o hipnograma", () => {
  it("**lê as fases e a frequência que vem como objeto dentro do trecho**", async () => {
    resposta = {
      series: [
        { startdate: 1790000000, enddate: 1790001800, state: FASE_DO_SONO.LEVE, hr: { "1790000100": 60, "1790000200": 62 } },
        { startdate: 1790001800, enddate: 1790003600, state: FASE_DO_SONO.PROFUNDO, hr: 55, rr: { "1790002000": 14 } },
      ],
    };
    const t = await hipnogramaDaNoite("tok", new Date(), new Date());
    expect(t).toHaveLength(2);
    expect(t[0].fase).toBe(FASE_DO_SONO.LEVE);
    expect(t[0].hr).toBe(61); // a média dos dois, não NaN
    expect(t[1].hr).toBe(55); // número solto também serve
    expect(t[1].rr).toBe(14);
  });

  it("vem ordenado, e um trecho sem início ou fase é descartado", async () => {
    resposta = {
      series: [
        { startdate: 1790003600, enddate: 1790005400, state: 3 },
        { startdate: 1790000000, enddate: 1790001800, state: 1 },
        { enddate: 1790009000, state: 2 },
        { startdate: 1790010000, enddate: 1790011000 },
      ],
    };
    const t = await hipnogramaDaNoite("tok", new Date(), new Date());
    expect(t.map((x) => x.inicio)).toEqual([1790000000, 1790003600]);
  });

  it("a fase `0` é acordado, e não é descartada por ser zero", async () => {
    // O erro fácil: `if (fase)` em vez de `Number.isFinite(fase)`. Acordado é
    // uma fase do sono, e some do gráfico se zero contar como ausência.
    resposta = { series: [{ startdate: 1790000000, enddate: 1790000600, state: 0 }] };
    const t = await hipnogramaDaNoite("tok", new Date(), new Date());
    expect(t).toHaveLength(1);
    expect(t[0].fase).toBe(FASE_DO_SONO.ACORDADO);
  });

  it("chama o `get`, e não o `getsummary` que já tínhamos", async () => {
    await hipnogramaDaNoite("tok", new Date(), new Date());
    expect(chamadas[0].path).toBe("/v2/sleep");
    expect(chamadas[0].body.action).toBe("get");
  });
});

describe("os treinos", () => {
  it("**lê os valores de dentro de `data`**", async () => {
    resposta = {
      series: [
        {
          startdate: 1790000000,
          enddate: 1790003600,
          category: 1,
          data: { calories: 320, distance: 5200, steps: 6400, hr_average: 132, hr_max: 168 },
        },
      ],
    };
    const t = await treinosDoPeriodo("tok", new Date(), new Date());
    expect(t[0]).toEqual({
      inicio: 1790000000,
      fim: 1790003600,
      categoria: 1,
      calorias: 320,
      distancia: 5200,
      passos: 6400,
      hrMedio: 132,
      hrMaximo: 168,
    });
  });

  it("um treino sem `data` continua a ser um treino", async () => {
    resposta = { series: [{ startdate: 1790000000, enddate: 1790001000, category: 2 }] };
    const t = await treinosDoPeriodo("tok", new Date(), new Date());
    expect(t).toHaveLength(1);
    expect(t[0].calorias).toBeUndefined();
  });

  it("pede por data em `YYYY-MM-DD`, que é o que este endpoint aceita", async () => {
    await treinosDoPeriodo("tok", new Date("2026-09-01T10:00:00Z"), new Date("2026-09-08T10:00:00Z"));
    expect(chamadas[0].body.action).toBe("getworkouts");
    expect(chamadas[0].body.startdateymd).toBe("2026-09-01");
    expect(chamadas[0].body.enddateymd).toBe("2026-09-08");
  });
});

describe("agrupar para desenhar", () => {
  const pontos = [
    { t: 0, hr: 60, steps: 10 },
    { t: 60, hr: 70, steps: 20 },
    { t: 120, hr: 80, steps: 5 },
    { t: 900, hr: 100, steps: 40 },
  ];

  it("**a frequência é média e os passos são soma**", () => {
    // Somar batimentos não significa nada, e tirar a média de passos esconde o
    // movimento. É o erro fácil deste agrupamento.
    const b = agruparPorIntervalo(pontos, 5);
    expect(b[0].hr).toBe(70); // média de 60, 70, 80
    expect(b[0].steps).toBe(35); // soma de 10, 20, 5
  });

  it("baldes sem batimento ficam com `null`, não com zero", () => {
    const b = agruparPorIntervalo([{ t: 0, steps: 12 }], 5);
    expect(b[0].hr).toBeNull();
    expect(b[0].steps).toBe(12);
  });

  it("um balde sem passos fica `null`, para não desenhar uma barra de zero", () => {
    const b = agruparPorIntervalo([{ t: 0, hr: 61 }], 5);
    expect(b[0].steps).toBeNull();
  });

  it("os baldes saem em ordem e são do tamanho pedido", () => {
    const b = agruparPorIntervalo(pontos, 5);
    expect(b.map((x) => x.t)).toEqual([0, 900]);
  });

  it("um intervalo não-positivo é erro, não uma divisão por zero silenciosa", () => {
    expect(() => agruparPorIntervalo(pontos, 0)).toThrow();
  });
});
