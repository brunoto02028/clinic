/**
 * @jest-environment node
 *
 * Nenhum `\x08` no código — o byte que faz uma regex nunca casar.
 *
 * ## Porque isto é um teste e não uma lição aprendida
 *
 * Porque a lição já foi aprendida **cinco vezes num só dia** (03/10/2026), e
 * continuou a acontecer. A forma é sempre a mesma: escrevo um ficheiro por um
 * script Python, a cadeia não é *raw*, e `"\b"` deixa de ser *barra + b* para
 * passar a ser o byte **0x08** — backspace.
 *
 * O efeito é pior do que um erro de sintaxe, porque não há erro nenhum:
 *
 * ```
 * /\x08o relógio\x08/.test("o relógio não assinalou nada")  →  false
 * ```
 *
 * Num `expect(...).not.toMatch(...)` isso **passa sempre**. O teste fica verde,
 * o relatório diz que o critério está coberto, e o que ele guarda não é
 * verificado por ninguém. Foi exactamente o que aconteceu ao guarda central da
 * 122 T-9: eu afirmei que a regra estava provada, e a regra não estava a ser
 * medida de todo.
 *
 * Dois dos casos anteriores eram `not.toMatch` sobre o papel do paciente — um
 * deles a garantir que as datas não saem em inglês num documento em português.
 *
 * ## O que este teste faz
 *
 * Varre o código-fonte e falha se encontrar o byte. É barato, corre em
 * milissegundos, e fecha a porta de vez.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const RAIZ = join(__dirname, "..");

/** Pastas que não são código nosso, ou que contêm artefactos binários. */
const IGNORAR = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "coverage",
  ".expo",
  "public",
  "ios",
  "android",
]);

const EXTENSOES = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

function* ficheiros(dir: string): Generator<string> {
  for (const nome of readdirSync(dir)) {
    if (IGNORAR.has(nome) || nome.startsWith(".build-verify") || nome.startsWith(".next-")) continue;
    const caminho = join(dir, nome);
    const st = statSync(caminho);
    if (st.isDirectory()) yield* ficheiros(caminho);
    else if (EXTENSOES.some((e) => nome.endsWith(e))) yield caminho;
  }
}

describe("o byte que faz uma regex nunca casar", () => {
  it("**não existe em nenhum ficheiro de código**", () => {
    const comByte: string[] = [];
    for (const f of ficheiros(RAIZ)) {
      const b = readFileSync(f);
      if (b.includes(0x08)) {
        const linha = b.toString("utf8").split("\n").findIndex((l) => l.includes("\u0008")) + 1;
        comByte.push(`${f.slice(RAIZ.length + 1)}:${linha}`);
      }
    }
    /*
     * A mensagem leva o caminho e a linha de propósito: quem apanhar isto está
     * a olhar para um teste verde que não mede nada, e precisa de ir lá já.
     */
    expect(comByte).toEqual([]);
  });

  it("e a armadilha é esta, para quem nunca lhe tropeçou", () => {
    /* `\b` numa cadeia não-*raw* de Python é 0x08, não barra + b. */
    const comByte = new RegExp("\u0008o relógio\u0008");
    const comPalavra = /\bo relógio\b/;
    const frase = "o relógio não assinalou nada";

    expect(comByte.test(frase)).toBe(false);
    expect(comPalavra.test(frase)).toBe(true);
  });
});
