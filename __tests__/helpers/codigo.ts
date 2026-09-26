import fs from "fs";
import path from "path";

/**
 * Ler código como texto, sem ler os comentários junto.
 *
 * ## Por que isto existe
 *
 * Muitos testes desta base afirmam coisas sobre o **código** lendo o arquivo
 * como string — é barato, e pega regressão que teste de comportamento não
 * pega. O problema é que o arquivo também contém a **explicação** do defeito,
 * e a explicação naturalmente cita o defeito pelo nome.
 *
 * Isso já aconteceu seis vezes aqui, sempre igual:
 *
 * - `session.user.clinicId` citado num comentário sobre o vazamento;
 * - `/LAB/i` casando com a palavra "label";
 * - `#FFFFFF` citado no docstring que explica por que ele saiu;
 * - `clinicalNote` citado no docstring que explica que o nome estava errado;
 * - `apagamos tudo` citado no docstring que explica que a tela não diz isso.
 *
 * Em todos, o teste acusava a explicação como se fosse o defeito — ou, pior,
 * passava porque a explicação existia.
 *
 * Treze arquivos tinham a própria cópia desta função, e o décimo quarto
 * esqueceu de escrevê-la. Uma função copiada treze vezes é uma função que
 * devia morar num lugar só.
 */
export function semComentarios(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\/.*/g, "");
}

const raiz = path.join(__dirname, "..", "..");

/** Lê um arquivo do repositório, pelos pedaços do caminho. */
export function ler(...p: string[]): string {
  return fs.readFileSync(path.join(raiz, ...p), "utf8");
}

/** O mesmo, já sem comentário — que é como a maioria dos testes quer. */
export function lerCodigo(...p: string[]): string {
  return semComentarios(ler(...p));
}

export { raiz };
