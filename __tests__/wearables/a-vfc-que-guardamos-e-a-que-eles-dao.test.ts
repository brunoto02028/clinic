/**
 * @jest-environment node
 *
 * A VFC que guardamos é a que a Withings dá (119 T-9).
 *
 * ## O que correu mal
 *
 * Pedíamos `sdnn_1`, um campo que **não existe** no `v2/sleep getsummary`. A
 * API não se queixa de campos que não conhece: devolve as noites sem ele, e a
 * coluna `hrv` ficava `null` em todas. O app da Withings mostrava **14 ms** e o
 * nosso não mostrava nada — e "nada" lê-se como *"o paciente não usou o
 * relógio"*, que é a ausência silenciosa outra vez.
 *
 * Os campos reais são `rmssd_start_avg` e `rmssd_end_avg`.
 *
 * ## Porque isto precisava de teste
 *
 * Porque a correcção introduziu uma **conta nossa** — a média dos dois — num
 * número que vai ao papel do médico e alimenta a detecção de desvio. Nada
 * ligava o nosso número aos 14 ms do app deles, e não havia um único teste do
 * caminho. Esta suíte mede o caminho inteiro, com a resposta deles como corpo.
 */

import { withingsSleep } from "@/lib/withings";

/** A resposta da Withings, como ela vem: `status: 0` e o corpo em `body`. */
const respondeCom = (series: any[]) => {
  (global as any).fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({ status: 0, body: { series } }),
  }));
};

/**
 * Uma noite, **com a forma que a resposta tem**: os campos vivem debaixo de
 * `data`, e só a `date` fica à superfície.
 *
 * Escrevi-a primeiro plana, e os testes falharam a dizer `null` em tudo — o que
 * é precisamente o que a API produziria se lhe pedíssemos o campo errado. Um
 * mock que não é um estado que a origem produz ensina o defeito a sobreviver.
 */
const noite = (extra: Record<string, unknown>) => ({
  date: "2026-10-02",
  data: {
    deepsleepduration: 6960,
    lightsleepduration: 9000,
    remsleepduration: 3600,
    wakeupduration: 600,
    hr_average: 55,
    ...extra,
  },
});

afterEach(() => {
  delete (global as any).fetch;
});

describe("o rMSSD da noite", () => {
  it("**a média do início e do fim** — o caso medido em produção", async () => {
    /*
     * Os valores reais da sondagem de 02/10/2026: `rmssd_start_avg: 15`,
     * `rmssd_end_avg: 14`. Guardámos 14,5 e o app deles mostrava 14 ms.
     */
    respondeCom([noite({ rmssd_start_avg: 15, rmssd_end_avg: 14 })]);
    const [n] = await withingsSleep("tok", new Date("2026-10-01T00:00:00Z"));
    expect(n.hrv).toBe(14.5);
  });

  it("**se só vier um, é esse** — e não a metade dele", async () => {
    respondeCom([noite({ rmssd_start_avg: 22 })]);
    const [a] = await withingsSleep("tok", new Date("2026-10-01T00:00:00Z"));
    expect(a.hrv).toBe(22);

    respondeCom([noite({ rmssd_end_avg: 18 })]);
    const [b] = await withingsSleep("tok", new Date("2026-10-01T00:00:00Z"));
    expect(b.hrv).toBe(18);
  });

  it("**sem nenhum dos dois é `null`, e nunca zero**", async () => {
    /*
     * Uma VFC de 0 ms não é a de ninguém viva. Entrando como zero, puxava a
     * média do período para baixo sem nada a denunciar — e é o estado de
     * **todas** as noites enquanto pedíamos o campo errado.
     */
    respondeCom([noite({})]);
    const [n] = await withingsSleep("tok", new Date("2026-10-01T00:00:00Z"));
    expect(n.hrv).toBeNull();
  });

  it("um campo que não é número não entra", async () => {
    respondeCom([noite({ rmssd_start_avg: "14", rmssd_end_avg: null })]);
    const [n] = await withingsSleep("tok", new Date("2026-10-01T00:00:00Z"));
    expect(n.hrv).toBeNull();
  });

  it("e um zero que eles mandem é um zero, não um buraco", async () => {
    /*
     * A distinção é deles, não nossa: se a API afirmar 0, guarda-se 0. O que
     * não se faz é **inventar** 0 onde não veio nada.
     */
    respondeCom([noite({ rmssd_start_avg: 0, rmssd_end_avg: 0 })]);
    const [n] = await withingsSleep("tok", new Date("2026-10-01T00:00:00Z"));
    expect(n.hrv).toBe(0);
  });

  it("arredonda a uma casa — e não a zero casas", async () => {
    /* 14,5 não pode virar 15: é uma medida, não uma contagem. */
    respondeCom([noite({ rmssd_start_avg: 13, rmssd_end_avg: 14 })]);
    const [n] = await withingsSleep("tok", new Date("2026-10-01T00:00:00Z"));
    expect(n.hrv).toBe(13.5);
  });
});

describe("o que se pede à API", () => {
  it("**pede os dois campos reais, e não `sdnn_1`**", async () => {
    respondeCom([noite({ rmssd_start_avg: 15, rmssd_end_avg: 14 })]);
    await withingsSleep("tok", new Date("2026-10-01T00:00:00Z"));

    const corpo = String(((global as any).fetch as jest.Mock).mock.calls[0][1].body);
    expect(corpo).toContain("rmssd_start_avg");
    expect(corpo).toContain("rmssd_end_avg");
    /*
     * `sdnn_1` não pode voltar. Um campo que a API não conhece é ignorado em
     * silêncio, logo pedi-lo não dá erro — dá uma coluna vazia.
     */
    expect(corpo).not.toContain("sdnn");
  });

  it("e continua a pedir o resto do sono, que já funcionava", async () => {
    respondeCom([noite({ rmssd_start_avg: 15 })]);
    const [n] = await withingsSleep("tok", new Date("2026-10-01T00:00:00Z"));
    /* 6960 + 9000 + 3600 segundos = 116 + 150 + 60 minutos. */
    expect(n.deepMinutes).toBe(116);
    expect(n.sleepDuration).toBe(116 + 150 + 60);
    expect(n.restingHr).toBe(55);
  });
});
