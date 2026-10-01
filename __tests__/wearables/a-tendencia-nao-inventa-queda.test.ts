/**
 * @jest-environment node
 *
 * A tendência do wearable não inventa o que não foi medido (099 T-2).
 *
 * A tela do paciente mostrava **o dia mais recente de cada métrica**. Um número
 * solto não diz nada: 62 bpm de repouso é bom ou ruim conforme o que era há
 * três semanas. A T-2 põe o período — e o período traz dois riscos que este
 * teste fecha.
 *
 * **O buraco.** O servidor devolve só os dias que têm registo. Uma noite sem o
 * relógio no pulso não é uma noite sem sono; desenhá-la como zero inventa uma
 * queda que não houve. O eixo tem de ser o calendário, não a lista de registos.
 *
 * **A frase.** "Melhorou" é interpretação. O que a tela diz é o que comparou:
 * a média dos dias recentes contra a dos antigos, com o número e a unidade.
 */

import { variacaoDoPeriodo, PontoDaSerie } from "../../mobile/src/lib/tendencia-calculo";

function serie(valores: Array<number | null>): PontoDaSerie[] {
  return valores.map((v, i) => ({ dia: `2026-09-${String(i + 1).padStart(2, "0")}`, valor: v }));
}

describe("a variação do período", () => {
  it("**compara médias, não duas leituras soltas**", () => {
    // Um dia mau de sono não é uma tendência. Com nove pontos, compara os três
    // primeiros com os três últimos.
    const v = variacaoDoPeriodo(serie([60, 60, 60, 55, 55, 55, 50, 50, 50]));
    expect(v).not.toBeNull();
    expect(v!.diasComparados).toBe(3);
    expect(v!.antigo).toBe(60);
    expect(v!.recente).toBe(50);
    expect(v!.delta).toBe(-10);
  });

  it("**os dias sem leitura não entram na conta**", () => {
    // É o defeito inteiro: se o `null` virasse zero, a média despencava e a
    // tela anunciaria uma queda que ninguém teve.
    const comBuracos = variacaoDoPeriodo(serie([60, null, 60, null, 55, 55, null, 50, 50, 50]));
    const semBuracos = variacaoDoPeriodo(serie([60, 60, 55, 55, 50, 50, 50]));
    expect(comBuracos).not.toBeNull();
    expect(comBuracos!.antigo).toBeGreaterThan(50);
    // Com zero no lugar do buraco, a média antiga cairia para perto de 40.
    expect(comBuracos!.antigo).toBeGreaterThanOrEqual(55);
    expect(semBuracos).not.toBeNull();
  });

  it("devolve `null` quando há poucos dias — e não um palpite", () => {
    expect(variacaoDoPeriodo(serie([60, 58, 59]))).toBeNull();
    expect(variacaoDoPeriodo(serie([60, null, null, null, 58]))).toBeNull();
    expect(variacaoDoPeriodo([])).toBeNull();
  });

  it("uma série sem leitura nenhuma não quebra", () => {
    expect(variacaoDoPeriodo(serie([null, null, null, null, null, null, null]))).toBeNull();
  });

  it("uma série constante tem variação zero, não uma divisão por zero", () => {
    const v = variacaoDoPeriodo(serie([62, 62, 62, 62, 62, 62, 62, 62, 62]));
    expect(v).not.toBeNull();
    expect(v!.delta).toBe(0);
  });

  it("o sinal é o certo: subir é positivo", () => {
    const v = variacaoDoPeriodo(serie([50, 50, 50, 55, 55, 55, 60, 60, 60]));
    expect(v!.delta).toBeGreaterThan(0);
  });
});

describe("a tela do paciente não dá nota ao valor", () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require("fs");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require("path");
  const TELA = path.join(
    __dirname, "..", "..", "mobile", "app", "(app)", "(clinica)", "wearable-data.tsx"
  );

  /** O código sem comentários: eles explicam o defeito e citam os limiares. */
  function codigo(): string {
    return fs
      .readFileSync(TELA, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((l: string) => {
        const s = l.trim();
        return !s.startsWith("//") && !s.startsWith("*");
      })
      .join("\n");
  }

  it("**nenhum valor é pintado por limiar fixo**", () => {
    // HRV acima de 40, FC abaixo de 65, SpO2 acima de 95 — eram três números no
    // código a decidir verde ou âmbar na tela do paciente. Isso é faixa de
    // referência, que é leitura clínica, e uma cor é uma afirmação: SpO2 de 95%
    // saía em âmbar, e 95% é um valor normal.
    const src = codigo();
    expect(src).not.toMatch(/hrv\s*(!=|>|<)[^\n]*colors\.(ok|warn|bad)/i);
    expect(src).not.toMatch(/restingHr[^\n]*colors\.(ok|warn|bad)/i);
    expect(src).not.toMatch(/spo2[^\n]*colors\.(ok|warn|bad)/i);
  });

  it("a tela abre em 30 dias, não em 7", () => {
    expect(codigo()).toMatch(/useState<7 \| 30 \| 90>\(30\)/);
  });

  it("a varredura lê a tela de verdade — senão aprova o vazio", () => {
    expect(codigo().length).toBeGreaterThan(2000);
    expect(codigo()).toContain("CartaoDeTendencia");
  });
});
