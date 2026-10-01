/**
 * @jest-environment node
 *
 * Só degraus de opacidade que o Tailwind emite (116, achado do QA online 01/10).
 *
 * O QA mediu a grade de faixas de pressão em produção e encontrou a escada de
 * gravidade **quebrada no último degrau**: a célula de `≥180/≥120` — a mais
 * grave de todas — saía **branca**, mais pálida que a vizinha menos grave.
 *
 * A causa: ela pede `bg-ba1-bad/15`, e a escala de opacidade do Tailwind tem
 * **10 e 20 e não tem 15**. A classe nunca é gerada, o navegador calcula
 * `rgba(0,0,0,0)`, e a célula fica transparente.
 *
 * ## Porque isto passou por tudo
 *
 * Uma classe que o Tailwind não gera **não dá erro de build, não dá aviso, e
 * não aparece em nenhum teste de rótulo**. O `tsc` não a vê, o jest não a vê, o
 * build fica verde. Ela só existe como ausência, na tela.
 *
 * Eram **73 classes** assim, em 22 arquivos — todas a pedir um tom que nunca
 * saiu. E a que mais custava era a do alarme.
 *
 * Tentei primeiro acrescentar o degrau à escala (`theme.extend.opacity`), e
 * **não funcionou**: medi o CSS emitido antes e depois e `/15` continuou
 * ausente. Então a correção foi mover os usos para degraus que existem — o que
 * também é mais honesto, porque não inventa uma escala paralela.
 */

import * as fs from "fs";
import * as path from "path";

const RAIZ = path.join(__dirname, "..", "..");

/**
 * A escala de opacidade que o Tailwind 3 gera por omissão.
 *
 * Medida, e não copiada da documentação: o CSS construído deste projeto emite
 * `/5`, `/10`, `/20`, `/30`, `/40`, `/80` e `/90` para os mesmos tokens, e
 * nunca `/15` nem `/8`.
 */
const DEGRAUS = new Set([0, 5, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95, 100]);

/** Todo `cor/N` usado no produto, com o arquivo e a linha. */
function opacidadesUsadas(): Array<{ onde: string; classe: string; degrau: number }> {
  const achados: Array<{ onde: string; classe: string; degrau: number }> = [];
  const anda = (dir: string) => {
    for (const nome of fs.readdirSync(dir)) {
      const p = path.join(dir, nome);
      if (fs.statSync(p).isDirectory()) {
        if (nome === "node_modules" || nome.startsWith(".")) continue;
        anda(p);
        continue;
      }
      if (!/\.tsx?$/.test(nome)) continue;
      const linhas = fs.readFileSync(p, "utf8").split("\n");
      linhas.forEach((linha, i) => {
        // Só as cores do tema: a paleta crua do Tailwind tem os seus próprios
        // tons e não é disto que esta varredura trata.
        for (const m of linha.matchAll(/\b(?:bg|text|border|ring|from|via|to)-(ba1-[a-z0-9-]+)\/(\d+)\b/g)) {
          achados.push({ onde: `${path.relative(RAIZ, p).split(path.sep).join("/")}:${i + 1}`, classe: m[0], degrau: Number(m[2]) });
        }
      });
    }
  };
  for (const base of ["app", "components"]) anda(path.join(RAIZ, base));
  return achados;
}

describe("toda opacidade pedida é uma que sai", () => {
  it("**nenhuma classe pede um degrau que o Tailwind não gera**", () => {
    // É o defeito inteiro: a classe não existe, e nada avisa. O estrago aparece
    // na tela, semanas depois, numa célula que devia gritar e estava branca.
    const fora = opacidadesUsadas().filter((o) => !DEGRAUS.has(o.degrau));
    expect(fora.map((o) => `${o.onde} ${o.classe}`)).toEqual([]);
  });

  it("a varredura encontra classes — senão aprova o vazio", () => {
    expect(opacidadesUsadas().length).toBeGreaterThan(100);
  });

  it("**e a escada da pressão sobe**: a crise é mais forte que a faixa abaixo", () => {
    // O controle que a 105 T-6 escreveu para as palavras, agora para a cor:
    // a leitura mais grave tem de **parecer** mais grave. Era exatamente isto
    // que estava invertido na tela, e nenhum teste de rótulo podia apanhar.
    const fonte = fs.readFileSync(
      path.join(RAIZ, "app", "dashboard", "blood-pressure", "page.tsx"),
      "utf8"
    );
    const grau = (faixa: string): number => {
      const i = fonte.indexOf(`${faixa}:`);
      expect(i).toBeGreaterThan(0);
      const m = fonte.slice(i, i + 220).match(/bg-ba1-bad\/(\d+)/);
      return m ? Number(m[1]) : 0;
    };
    expect(grau("CRISIS")).toBeGreaterThan(grau("STAGE2"));
  });
});
