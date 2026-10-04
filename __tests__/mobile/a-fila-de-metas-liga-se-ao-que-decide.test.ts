/**
 * @jest-environment node
 *
 * A fila "Metas de hoje" está ligada a quem decide (118 T-10).
 *
 * ## Porque um teste que lê a tela como texto
 *
 * O `anel-calculo` tem 29 testes e prova tudo o que o anel precisa de saber:
 * que sem meta não há anel, que uma leitura de outro dia não desenha progresso,
 * quantos graus de arco cada fracção vale. Nada disso serve se a tela não lhe
 * passar os argumentos — e foi exactamente isso que o review de 04/10/2026
 * achou duas vezes no mesmo bloco de JSX:
 *
 * - o anel não recebia `dia`, e a `BarraDeMeta` doze linhas abaixo recebia. A
 *   fila dizia "METAS DE HOJE" com o anel cheio por 14.200 passos de sábado, em
 *   cima do ladrilho que dizia "Leitura de outro dia". Contradiziam-se na mesma
 *   tela, e a afirmação errada era a de cima e a maior.
 * - a guarda da fila testava se a **métrica existe** (`chave === "passos"`),
 *   não se tem meta. Quem nunca abriu `/metas` — e as metas são opt-in — via a
 *   faixa com dois círculos vazios e dois travessões.
 *
 * É a lição de sempre: regra provada na função, desfeita no desenho. O que se
 * guarda aqui é só a **ligação**, que é o que nenhum teste da função alcança.
 */

import fs from "fs";
import path from "path";

const raiz = path.join(__dirname, "..", "..");
const ler = (...p: string[]) => fs.readFileSync(path.join(raiz, ...p), "utf8");
const semComentarios = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\/.*/g, "");

const tela = semComentarios(ler("mobile", "app", "(app)", "(clinica)", "(tabs)", "saude.tsx"));
const anel = semComentarios(ler("mobile", "src", "components", "AnelDeMeta.tsx"));

describe("o anel recebe o dia", () => {
  it("**a tela passa-lhe `dia`**, como passa à barra", () => {
    const bloco = tela.match(/<AnelDeMeta[\s\S]*?\/>/);
    expect(bloco).not.toBeNull();
    expect(bloco![0]).toMatch(/dia=\{/);
  });

  it("**e o anel usa-o para decidir**, em vez de o aceitar e ignorar", () => {
    /* `estadoDoAnel` é quem olha para o dia; o componente não repete a regra. */
    expect(anel).toMatch(/estadoDoAnel\(\s*valor,\s*meta,\s*dia\s*\)/);
  });
});

describe("a fila só aparece quando há meta", () => {
  it("**a guarda é sobre a meta, não sobre a métrica existir**", () => {
    const guarda = tela.match(/const comMeta = [\s\S]*?\n  \];?|const comMeta = [\s\S]*?\n    : \[\];/);
    expect(guarda).not.toBeNull();
    expect(guarda![0]).toMatch(/metaDoDestaque/);
  });

  it("**e espera pelas metas** — carregar não é o mesmo que não ter", () => {
    /*
     * Sem isto, `metas.data` ainda `undefined` fazia toda a meta ler como
     * ausente, e o anel afirmava "sem meta definida" a quem tem meta. Pior: se
     * o pedido falhar, é para sempre. Falha nossa com a cara de escolha dela.
     */
    expect(tela).toMatch(/metas\.data\s*\n?\s*\?\s*lista\.filter/);
  });

  it("**a fila desenha a lista filtrada**, não a lista inteira", () => {
    expect(tela).toMatch(/\{comMeta\.length > 0 && \(/);
    expect(tela).toMatch(/\{comMeta\.map\(/);
    /* A guarda antiga, que só olhava para a chave, não pode voltar. */
    expect(tela).not.toMatch(/lista\.some\(\(d\) => d\.chave === "passos"/);
  });
});

describe("o componente não decide nada por si", () => {
  it("**os lados da borda saem de `ladosPintados`**", () => {
    /*
     * Foi o JSX a escolher os lados que desenhou um quarto de volta onde queria
     * meia. Nenhum nome de lado pode estar cravado aqui.
     */
    expect(anel).toMatch(/ladosPintados\(lado\)/);
    expect(anel).not.toMatch(/borderRightColor: lado === /);
    expect(anel).not.toMatch(/borderLeftColor: lado === /);
  });

  it("**e a rotação sai de `rotacaoDaMetade`**, com o offset lá dentro", () => {
    expect(anel).toMatch(/rotate: `\$\{rotacaoDaMetade\(a, lado\)\}deg`/);
    expect(anel).not.toMatch(/\+ 45/);
  });

  it("**o trilho é `border`**, que é a cor que se vê", () => {
    /* `borderSubtle` dava 1,10 contra o cartão escuro: o anel vazio desaparecia. */
    expect(anel).not.toMatch(/borderSubtle/);
    expect(anel.match(/borderColor: t\.colors\.border\b/g)?.length).toBe(2);
  });
});
