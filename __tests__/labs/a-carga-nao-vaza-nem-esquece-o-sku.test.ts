/**
 * @jest-environment node
 *
 * As duas ressalvas do QA da T-13, fechadas e fixadas (081).
 *
 * O QA aprovou a carga dos 421 e apontou duas coisas que não eram critérios
 * falhados — eram defeitos que só mordem depois:
 *
 * **A.** O `lmlSku` dos 22 kits antigos estava preenchido só no banco local, por
 * SQL que eu corri à mão. Nada no repositório o reproduzia. Em produção o
 * `db push` cria a coluna `NULL`, nada a preenche, e a sincronização da T-5 —
 * que casa por SKU — criaria um segundo registo para cada um dos 22. Era o
 * defeito que a T-13 fechou para os 421, transferido para os 22 que já podem
 * ter pedidos a apontar para eles.
 *
 * **B.** O aviso de "vende abaixo do custo" foi escrito em `description`. Esse
 * campo é entregue ao paciente nas duas línguas por `lib/lab-patient.ts`, e
 * ativar o produto publicaria **o nosso custo** no app, no lugar da descrição
 * do exame.
 *
 * Nenhuma das duas se vê a ler o resultado da carga: a primeira só aparece
 * noutro ambiente, a segunda só aparece no dia em que alguém clica. Daí um
 * teste para cada.
 */

import * as fs from "fs";
import * as path from "path";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { nomeLimpo } = require("../../scripts/lml-price-list-parse.js");

const RAIZ = path.join(__dirname, "..", "..");

/**
 * O código de um script **sem comentários**.
 *
 * Os comentários destes dois arquivos citam de propósito `description` e
 * `lmlSku` para explicar os defeitos. Uma varredura que os lesse aprovaria — ou
 * reprovaria — pelo texto da explicação em vez do código.
 */
function semComentarios(rel: string): string {
  return fs
    .readFileSync(path.join(RAIZ, rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => {
      const s = l.trim();
      return !s.startsWith("//") && !s.startsWith("*");
    })
    .join("\n");
}

describe("A: o SKU dos 22 kits nasce preenchido em qualquer ambiente", () => {
  it("**o seed escreve `lmlSku`**, e não só `lmlProductId`", () => {
    // O seed corre no boot, então é ele que tem de preencher — um UPDATE que eu
    // corri na minha máquina não existe para produção.
    expect(semComentarios("scripts/seed-lab-products.js")).toContain("lmlSku: k.code");
  });

  it("escreve nos dois caminhos: no que cria e no que atualiza", () => {
    // Está no objeto `shared`, que os dois usam. Se alguém o mover só para o
    // `create`, quem já existe continua sem SKU — que era exatamente o estado
    // que o QA encontrou.
    const codigo = semComentarios("scripts/seed-lab-products.js");
    const iShared = codigo.indexOf("const shared = {");
    const iFechaShared = codigo.indexOf("};", iShared);
    expect(iShared).toBeGreaterThan(0);
    expect(codigo.slice(iShared, iFechaShared)).toContain("lmlSku");
  });
});

describe("B: o aviso de prejuízo não vai para um campo que o paciente lê", () => {
  it("**a carga nunca escreve `description`**", () => {
    const codigo = semComentarios("scripts/load-lml-price-list.js");
    expect(codigo).not.toMatch(/description\s*:/);
  });

  it("mas o aviso continua a existir, no log", () => {
    // Tirar o campo não pode ser tirar o aviso: o `LEM` vende abaixo do custo e
    // alguém tem de saber antes de o ligar.
    const codigo = semComentarios("scripts/load-lml-price-list.js");
    expect(codigo).toContain("abaixo do custo");
    expect(codigo).toMatch(/venda <= custo/);
  });

  it("o campo que vaza é mesmo o que o paciente lê — a razão da regra", () => {
    // Se um dia `lib/lab-patient.ts` parar de entregar `description` ao
    // paciente, esta regra perde o motivo e este teste cai avisando.
    expect(fs.readFileSync(path.join(RAIZ, "lib", "lab-patient.ts"), "utf8")).toMatch(
      /description:\s*\{[\s\S]{0,160}p\.description/
    );
  });
});

describe("sem preço, o exame não entra — nunca entra a zero", () => {
  it("**a carga não tem um `|| 0` a preencher o preço de venda**", () => {
    // O que eu tinha escrito era `retailPrice: venda !== null ? venda : custo || 0`,
    // só para satisfazer a coluna. Hoje o ramo está morto — os 421 têm os dois
    // preços — mas uma planilha futura com um preço em falta criaria um exame
    // **grátis** em vez de dar erro, e ninguém olharia. Agora descarta a linha
    // e diz quantas descartou.
    const codigo = semComentarios("scripts/load-lml-price-list.js");
    expect(codigo).not.toMatch(/retailPrice[^\n]*\|\|/);
    expect(codigo).toContain("precoDeVenda === null");
    expect(codigo).toContain("descartados");
  });

  it("e a regra da T-5 continua: sem RRP, usa o custo", () => {
    expect(semComentarios("scripts/load-lml-price-list.js")).toMatch(
      /precoDeVenda\s*=\s*venda\s*!==\s*null\s*\?\s*venda\s*:\s*custo/
    );
  });
});

describe("os doze nomes que vieram estragados da planilha", () => {
  it("**separador vira travessão**", () => {
    expect(nomeLimpo("Acid Phosphatase ‚ Total")).toBe("Acid Phosphatase – Total");
    expect(nomeLimpo("Human Herpes Virus ‚ 8 (IgG)")).toBe("Human Herpes Virus – 8 (IgG)");
    expect(nomeLimpo("Immunoglobulin E ‚ Total")).toBe("Immunoglobulin E – Total");
  });

  it("**colado a um `s` vira apóstrofo** — é o único caso assim dos doze", () => {
    expect(nomeLimpo("Leptospirosis (Weil‚s Disease) Antibodies (IgM)")).toBe(
      "Leptospirosis (Weil's Disease) Antibodies (IgM)"
    );
  });

  it("sem espaço antes também é separador", () => {
    expect(nomeLimpo("Iodine‚ Serum")).toBe("Iodine – Serum");
  });

  it("um nome limpo passa intacto", () => {
    for (const n of ["Vitamin D", "Cholesterol - Total", "ACTH (Adreno Corticotrophic Hormone)"]) {
      expect(nomeLimpo(n)).toBe(n);
    }
  });

  it("**a planilha real tem exatamente doze, e nenhum sobrevive à limpeza**", () => {
    // Se a LML mandar a planilha corrigida, a primeira expectativa cai — e é o
    // aviso certo de que a origem mudou e esta regra pode sair.
    const csv = fs.readFileSync(
      path.join(RAIZ, "specs", "081-exames-de-laboratorio-pelo-app", "referencia", "precos-2026.csv"),
      "utf8"
    );
    const estragados = (csv.match(/‚/g) || []).length;
    expect(estragados).toBe(12);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { lerCsv } = require("../../scripts/lml-price-list-parse.js");
    const nomes = lerCsv(csv).map((r: Record<string, string>) => nomeLimpo(r["Product name"]));
    expect(nomes.filter((n: string) => n.includes("‚"))).toEqual([]);
  });
});
