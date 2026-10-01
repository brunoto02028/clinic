/**
 * @jest-environment node
 *
 * O dia hora a hora e a noite fase a fase (099 T-8).
 *
 * *"Com todas as informações e horas e minutos, assim como o pessoal da
 * Withings oferece."*
 *
 * Duas regras que o período já tinha ensinado, agora dentro do dia:
 *
 * **Buraco é buraco.** Uma hora sem leitura não é uma hora com zero batimentos.
 *
 * **E uma terceira, que só existe dentro do dia: "ainda não aconteceu" não é
 * "não foi medido".** Às nove da manhã, o resto do dia está vazio porque ainda
 * não chegou; às nove da noite, um vazio às três da tarde é o relógio fora do
 * pulso. Desenhar os dois iguais faz a pessoa procurar um defeito que não
 * existe — ou ignorar um que existe.
 */

import {
  horasDoDia,
  totaisPorFase,
  despertares,
  PontoDoDia,
  TrechoDaNoite,
} from "../../mobile/src/lib/dia-e-noite-calculo";

/** Um ponto na hora `h` de um dia fixo, em UTC-neutro: usa-se a hora local. */
function naHora(h: number, hr: number | null, steps: number | null = null): PontoDoDia {
  const d = new Date(2026, 8, 15, h, 30, 0, 0); // 15/09/2026, hora local
  return { t: Math.floor(d.getTime() / 1000), hr, steps };
}

describe("as horas do dia", () => {
  it("devolve sempre 24 horas, mesmo com uma leitura só", () => {
    const hs = horasDoDia([naHora(9, 64)], { ehHoje: false, horaAgora: 23 });
    expect(hs).toHaveLength(24);
    expect(hs[9].hr).toBe(64);
  });

  it("**uma hora sem leitura fica `null`, não zero**", () => {
    const hs = horasDoDia([naHora(9, 64)], { ehHoje: false, horaAgora: 23 });
    expect(hs[10].hr).toBeNull();
    // Um zero aqui desenharia uma barra no chão e diria que o coração parou.
    expect(hs[10].hr).not.toBe(0);
  });

  it("**'ainda não aconteceu' é diferente de 'não foi medido'**", () => {
    const hs = horasDoDia([naHora(9, 64)], { ehHoje: true, horaAgora: 10 });
    // Medido não foi, e já passou:
    expect(hs[8].futuro).toBe(false);
    expect(hs[8].hr).toBeNull();
    // Ainda não chegou:
    expect(hs[14].futuro).toBe(true);
    expect(hs[14].hr).toBeNull();
  });

  it("num dia passado nada é futuro, mesmo às três da manhã", () => {
    const hs = horasDoDia([naHora(9, 64)], { ehHoje: false, horaAgora: 3 });
    expect(hs.filter((h) => h.futuro)).toEqual([]);
  });

  it("**a frequência é média e os passos somam**, dentro da hora", () => {
    const hs = horasDoDia(
      [
        { ...naHora(9, 60, 100) },
        { ...naHora(9, 80, 150) },
      ],
      { ehHoje: false, horaAgora: 23 }
    );
    expect(hs[9].hr).toBe(70);
    expect(hs[9].steps).toBe(250);
  });

  it("uma hora com passos e sem batimento tem passos e `hr` nulo", () => {
    const hs = horasDoDia([naHora(9, null, 320)], { ehHoje: false, horaAgora: 23 });
    expect(hs[9].hr).toBeNull();
    expect(hs[9].steps).toBe(320);
  });

  it("sem pontos devolve vazio, e não 24 horas de nada", () => {
    // Vinte e quatro buracos são um gráfico; vazio é uma frase. São telas
    // diferentes, e a decisão é de quem desenha.
    expect(horasDoDia([], { ehHoje: true, horaAgora: 12 })).toEqual([]);
  });
});

describe("os totais da noite", () => {
  const noite: TrechoDaNoite[] = [
    { inicio: 1000, fim: 1600, fase: 0 }, // 10 min acordado, a adormecer
    { inicio: 1600, fim: 5200, fase: 1 }, // 60 min leve
    { inicio: 5200, fim: 8800, fase: 2 }, // 60 min profundo
    { inicio: 8800, fim: 9400, fase: 0 }, // 10 min acordado, no meio
    { inicio: 9400, fim: 13000, fase: 3 }, // 60 min REM
    { inicio: 13000, fim: 13600, fase: 0 }, // 10 min acordado, ao acordar
  ];

  it("soma o tempo de cada fase", () => {
    const t = totaisPorFase(noite);
    expect(t[1]).toBe(3600);
    expect(t[2]).toBe(3600);
    expect(t[3]).toBe(3600);
    expect(t[0]).toBe(1800); // os três trechos acordado
  });

  it("**a fase 0 conta**, porque acordado é uma fase do sono", () => {
    expect(totaisPorFase(noite)[0]).toBeGreaterThan(0);
  });

  it("um trecho de duração zero ou negativa não entra", () => {
    const t = totaisPorFase([{ inicio: 100, fim: 100, fase: 2 }, { inicio: 500, fim: 400, fase: 2 }]);
    expect(t[2]).toBeUndefined();
  });

  it("**deitar e acordar não contam como despertares**", () => {
    // Contá-los somaria dois a toda a gente, todas as noites — um número que
    // parece informação e é artefacto.
    expect(despertares(noite)).toBe(1);
  });

  it("uma noite sem interrupção tem zero despertares", () => {
    expect(
      despertares([
        { inicio: 0, fim: 100, fase: 0 },
        { inicio: 100, fim: 3700, fase: 2 },
        { inicio: 3700, fim: 3800, fase: 0 },
      ])
    ).toBe(0);
  });

  it("noites curtas demais para ter meio não quebram", () => {
    expect(despertares([])).toBe(0);
    expect(despertares([{ inicio: 0, fim: 10, fase: 0 }])).toBe(0);
    expect(despertares([{ inicio: 0, fim: 10, fase: 0 }, { inicio: 10, fim: 20, fase: 1 }])).toBe(0);
  });
});

describe("a data é a local, não a UTC", () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { diaLocal } = require("../../mobile/src/lib/dia-e-noite-calculo");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require("fs");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require("path");

  const TELA = path.join(
    __dirname, "..", "..", "mobile", "app", "(app)", "(clinica)", "wearable-data.tsx"
  );

  function semComentarios(p: string): string {
    return fs
      .readFileSync(p, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((l: string) => {
        const s = l.trim();
        return !s.startsWith("//") && !s.startsWith("*");
      })
      .join("\n");
  }

  it("devolve `YYYY-MM-DD`", () => {
    expect(diaLocal(new Date(2026, 9, 5, 0, 30))).toBe("2026-10-05");
    expect(diaLocal(new Date(2026, 0, 1, 23, 59))).toBe("2026-01-01");
  });

  it("**usa os campos locais, não os UTC**", () => {
    // Este teste é de leitura de código de propósito: o jest corre com
    // `TZ=UTC`, e sob UTC as duas versões dão o mesmo resultado. Um teste de
    // comportamento aqui passaria verde com o defeito dentro — que é
    // exatamente o que o fuso de Londres esconde.
    const src = fs.readFileSync(
      path.join(__dirname, "..", "..", "mobile", "src", "lib", "dia-e-noite-calculo.ts"),
      "utf8"
    );
    const i = src.indexOf("export function diaLocal");
    const corpo = src.slice(i, i + 400);
    expect(corpo).toContain("getFullYear");
    expect(corpo).not.toContain("getUTC");
    expect(corpo).not.toContain("toISOString");
  });

  it("**a tela não monta data com `toISOString`**", () => {
    // Eram três sítios. Um auxiliar com nome evita o quarto.
    expect(semComentarios(TELA)).not.toMatch(/toISOString\(\)\.slice\(0,\s*10\)/);
  });
});

describe("a escala do gráfico do dia", () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { escalaDasBarras, alturaDaBarra } = require("../../mobile/src/lib/dia-e-noite-calculo");

  it("**um pico isolado de cinco minutos não aperta as barras no meio**", () => {
    // Era o defeito: a escala vinha dos pontos crus. Uma hora com um ponto a
    // 140 e os outros a 60 tem média 73 — e com a escala nos pontos, a barra
    // mais alta do dia ficava a meio da altura, e o dia parecia plano.
    const pontos: PontoDoDia[] = [
      naHora(8, 60), naHora(8, 60), naHora(8, 60), naHora(8, 140),
      naHora(9, 58), naHora(10, 62), naHora(11, 65),
    ];
    const horas = horasDoDia(pontos, { ehHoje: false, horaAgora: 23 });
    const escala = escalaDasBarras(horas);
    // A barra mais alta é a hora de maior **média**, e usa a altura toda.
    const maisAlta = Math.max(...horas.filter((h) => h.hr !== null).map((h) => alturaDaBarra(h.hr as number, escala)));
    expect(maisAlta).toBe(8 + 46);
    // E o máximo da escala é a média, nunca o pico cru.
    expect(escala.max).toBeLessThan(140);
    expect(escala.max).toBe(80); // (60+60+60+140)/4
  });

  it("a barra mais baixa fica no mínimo, não no chão", () => {
    const horas = horasDoDia([naHora(8, 60), naHora(9, 80)], { ehHoje: false, horaAgora: 23 });
    const escala = escalaDasBarras(horas);
    expect(alturaDaBarra(60, escala)).toBe(8);
    expect(alturaDaBarra(80, escala)).toBe(54);
  });

  it("um dia constante não divide por zero", () => {
    const horas = horasDoDia([naHora(8, 62), naHora(9, 62)], { ehHoje: false, horaAgora: 23 });
    const escala = escalaDasBarras(horas);
    expect(escala.faixa).toBe(1);
    expect(Number.isFinite(alturaDaBarra(62, escala))).toBe(true);
  });

  it("sem batimento nenhum, a escala é inofensiva", () => {
    expect(escalaDasBarras([])).toEqual({ min: 0, max: 0, faixa: 1 });
  });
});
