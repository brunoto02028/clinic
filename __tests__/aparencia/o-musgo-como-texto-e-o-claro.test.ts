/**
 * @jest-environment node
 *
 * O musgo usado como texto é o claro (116 T-2).
 *
 * O Bruno mandou uma captura do painel com duas palavras: *"cores ruins"*.
 *
 * ## O que a medição disse, e não era o que eu esperava
 *
 * Eu tinha aberto a atividade a contar classes de paleta crua — 608 delas, em
 * 59 arquivos. Medido o contraste que **sai na tela**, a paleta crua está
 * largamente bem: a legenda das faixas de pressão dá de **4,84 a 6,16**, porque
 * cada célula junta um fundo claro com um texto escuro da mesma cor.
 *
 * O que falha é outra coisa: **o verde da marca usado como texto sobre o painel
 * escuro**.
 *
 * | par | contraste | mínimo | quantos |
 * |---|---|---|---|
 * | `#4F7361` sobre o cartão | 2,78 | 4,5 | 10 |
 * | `#4F7361` sobre o cartão claro | 3,04 | 4,5 | 10 |
 * | `#4F7361` sobre o diálogo | 2,95 | 4,5 | 2 |
 * | cinza a 45% de alfa | 3,81 | 4,5 | 7 |
 *
 * **Vinte e duas das vinte e nove falhas de uma tela são a mesma cor.**
 *
 * ## O token já existia, com o porquê escrito
 *
 * `--accent-bright`, e o comentário de quem o criou diz exatamente isto:
 * *"--primary itself (38% L) fails WCAG AA as text color here (~3:1); this
 * clears 8:1+"*. Alguém diagnosticou, criou a variável, escreveu a razão — e as
 * 382 chamadas continuaram em `text-primary`.
 *
 * Uma regra, e não 382 trocas. E é segura nos dois lados: `.public-site`
 * redefine `--accent-bright` para o valor do próprio `--primary`, então na área
 * clara — onde o musgo escuro já lê bem — nada muda.
 *
 * ## Medido, e não anunciado
 *
 * Antes **3,04**; depois **7,05**, na cor que o navegador computa. A memória
 * desta casa diz porquê: já troquei 4,9 por 3,2 anunciando que estava a
 * melhorar.
 */

import * as fs from "fs";
import * as path from "path";

const RAIZ = path.join(__dirname, "..", "..");

function css(): string {
  return fs.readFileSync(path.join(RAIZ, "app", "globals.css"), "utf8");
}

describe("o texto em musgo usa o token claro", () => {
  it("**a regra existe, e é sobre `color`**", () => {
    const c = css();
    expect(c).toMatch(/\.text-primary\s*\{\s*color:\s*hsl\(var\(--accent-bright\)\);?\s*\}/);
  });

  it("**e só sobre a cor do texto** — fundo e borda continuam com a marca", () => {
    // `bg-primary` e `border-primary` são superfície, não letra. Um selo cheio
    // de musgo com texto branco por cima está certo, e clarear o fundo dele
    // seria trocar um problema por outro.
    const c = css();
    const i = c.indexOf(".text-primary {");
    const regra = c.slice(i, i + 120);
    expect(regra).not.toMatch(/background/);
    expect(regra).not.toMatch(/border-color/);
  });

  it("**o token claro continua mais claro que o `--primary`**", () => {
    // Se alguém igualar os dois, a regra passa a não fazer nada e a tela volta
    // a 3:1 sem que nenhum teste caia — é a forma silenciosa de desfazer isto.
    const c = css();
    const claro = c.match(/--accent-bright:\s*(\d+)\s+(\d+)%\s+(\d+)%/);
    const escuro = c.match(/--primary:\s*(\d+)\s+(\d+)%\s+(\d+)%/);
    expect(claro).toBeTruthy();
    expect(escuro).toBeTruthy();
    expect(Number(claro![3])).toBeGreaterThan(Number(escuro![3]));
  });

  it("**a área clara devolve o musgo escuro**", () => {
    // `.public-site` redefine a variável, e é isso que torna uma regra global
    // segura: na área do paciente, `text-primary` continua a ser o musgo de
    // sempre.
    const c = css();
    const i = c.indexOf(".public-site");
    expect(i).toBeGreaterThan(0);
    expect(c.slice(i)).toMatch(/--accent-bright:/);
  });

  it("a razão está escrita ao lado do token, e não só aqui", () => {
    // O comentário que já existia é o que me poupou o diagnóstico inteiro.
    expect(css()).toMatch(/fails WCAG AA as text color/);
  });
});
