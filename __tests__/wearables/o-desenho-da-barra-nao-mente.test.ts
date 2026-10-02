/**
 * @jest-environment node
 *
 * O desenho da barra não mente (118 T-7, achado do QA e do review de 02/10).
 *
 * ## A porta por onde o defeito entrou
 *
 * A regra *"passar da meta não é achatado em 100%"* estava na `progresso()`,
 * tinha um teste nomeado e caía por mutação. E estava **desfeita no JSX**, seis
 * linhas abaixo do comentário que a enunciava: `width: Math.min(100, fracao *
 * 100)`, sem mais nada. Quem andou 16.000 com meta de 8.000 via a mesma barra
 * cheia de quem andou 8.000 exactos.
 *
 * Dezassete mutações passaram verdes. O que elas provavam era a função; o que a
 * pessoa lê é a tela, e nesta base **o que a tela desenha não é verificável** —
 * o app não tem harness de componente, e acrescentar um é uma dependência nova.
 *
 * ## O que este ficheiro faz em vez disso
 *
 * Tira a decisão da tela. O corte dos 100% e a frase do excesso passaram a ser
 * funções, testadas aqui; o componente só as chama. E o último teste fecha a
 * porta: **o corte só pode viver num sítio**, senão a próxima tela volta a
 * cortar por conta própria.
 */

import fs from "fs";
import path from "path";
import {
  larguraDaBarra,
  passouDaMeta,
  porCentoDaMeta,
  progresso,
} from "../../mobile/src/lib/resumo-de-saude";

describe("a largura da barra", () => {
  it("é a fração, em por cento", () => {
    expect(larguraDaBarra(0.75)).toBe(75);
    expect(larguraDaBarra(1)).toBe(100);
  });

  it("**corta em 100** — é física, um View não passa do pai", () => {
    expect(larguraDaBarra(2)).toBe(100);
    expect(larguraDaBarra(17.5)).toBe(100);
  });

  it("não desenha nada com fração nula ou absurda", () => {
    // `progresso()` nunca produz nenhum destes — exige meta > 0 e valores
    // finitos. Mas uma barra é desenho, e desenho não deve ter de confiar em
    // quem o chama: diante de um número que não é número, não desenha nada.
    expect(larguraDaBarra(0)).toBe(0);
    expect(larguraDaBarra(-1)).toBe(0);
    expect(larguraDaBarra(NaN)).toBe(0);
    expect(larguraDaBarra(Infinity)).toBe(0);
  });
});

describe("o corte não pode ser a última palavra", () => {
  it("**passar da meta é dito**, porque a barra cheia já não o diz", () => {
    expect(passouDaMeta(2)).toBe(true);
    expect(passouDaMeta(1.01)).toBe(true);
  });

  it("cumprir exactamente não é passar", () => {
    expect(passouDaMeta(1)).toBe(false);
    expect(passouDaMeta(0.99)).toBe(false);
  });

  it("**o dobro é dito como dobro** — 200%, não 100%", () => {
    // A barra desenha 100 nos dois casos; é esta frase que os separa.
    const dobro = progresso(16000, 8000)!;
    const exacto = progresso(8000, 8000)!;
    expect(larguraDaBarra(dobro.fracao)).toBe(larguraDaBarra(exacto.fracao));
    expect(porCentoDaMeta(dobro.fracao)).toBe(200);
    expect(porCentoDaMeta(exacto.fracao)).toBe(100);
    expect(passouDaMeta(dobro.fracao)).toBe(true);
    expect(passouDaMeta(exacto.fracao)).toBe(false);
  });

  it("a percentagem é inteira — 160%, não 160,00000001%", () => {
    expect(porCentoDaMeta(1.6)).toBe(160);
    expect(porCentoDaMeta(0.666)).toBe(67);
  });
});

describe("o corte vive num sítio só", () => {
  /**
   * Um teste de texto, e por isso **sem comentários a contar**: o comentário
   * que explica o defeito satisfaria a busca por ele, e isso já me morde nesta
   * base mais de uma vez.
   */
  const semComentarios = (src: string) =>
    src
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/(^|[^:])\/\/.*$/gm, "$1 ");

  const ficheiros = (dir: string): string[] => {
    const out: string[] = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) out.push(...ficheiros(p));
      else if (/\.tsx?$/.test(e.name)) out.push(p);
    }
    return out;
  };

  const raiz = path.join(__dirname, "..", "..", "mobile");
  const aBarra = path.join(raiz, "src", "lib", "resumo-de-saude.ts");

  it("**só a `larguraDaBarra` corta a fração** — nenhuma tela corta por conta própria", () => {
    const culpados: string[] = [];
    for (const f of [...ficheiros(path.join(raiz, "app")), ...ficheiros(path.join(raiz, "src", "components"))]) {
      const src = semComentarios(fs.readFileSync(f, "utf8"));
      /* `Math.min(100, …)` sobre uma fração ou um progresso é o corte. */
      if (/Math\.min\(\s*100\s*,[^)]*(frac|progres|meta)/i.test(src)) {
        culpados.push(path.relative(raiz, f));
      }
    }
    expect(culpados).toEqual([]);
  });

  it("e a função que corta existe mesmo, no sítio onde é testada", () => {
    // Sem isto, apagar a `larguraDaBarra` deixaria o teste acima verde a
    // guardar o nada.
    expect(fs.existsSync(aBarra)).toBe(true);
    expect(semComentarios(fs.readFileSync(aBarra, "utf8"))).toMatch(
      /export function larguraDaBarra/
    );
  });
});
