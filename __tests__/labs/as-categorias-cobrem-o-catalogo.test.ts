/**
 * @jest-environment node
 *
 * As categorias cobrem o catálogo inteiro, e têm nome nas duas línguas
 * (081, T-14).
 *
 * A planilha da LML **não tem coluna de categoria** e a tela do catálogo navega
 * por categoria. As regras são nossas, a pedido do Bruno — *"de acordo com as
 * categorias que nós mesmos estamos montando"*.
 *
 * ## O que este teste protege
 *
 * **Que nenhum exame fique sem categoria.** Um exame sem categoria é um exame
 * que não aparece em nenhum chip: existe no banco e não existe na tela.
 *
 * **Que toda categoria tenha nome nas duas línguas.** A chave fica no banco, o
 * rótulo fica em `lib/lab-category-labels.ts`, e os dois podem desalinhar sem
 * dar erro — foi o que aconteceu com `sexual_health`, acrescentada às regras
 * depois dos rótulos: a lista de revisão saiu com `sexual_health /
 * sexual_health` no lugar do nome. Em produção isso seria um chip com um nome
 * de variável.
 *
 * **Que um padrão não roube o nome de outra categoria.** `health profile`
 * esteve nas regras do painel geral e apanhava o `Heart Health Profile`, que é
 * cardiovascular. Um padrão que casa o nome de outra categoria não é um padrão,
 * é um acidente.
 */

import * as fs from "fs";
import * as path from "path";
import { LAB_CATEGORY_LABELS, labCategoryLabel } from "@/lib/lab-category-labels";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { CHAVES, categorizar, todasAsCategorias, REGRAS } = require("../../scripts/lab-categories.js");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { lerCsv, nomeLimpo, composicao } = require("../../scripts/lml-price-list-parse.js");

const RAIZ = path.join(__dirname, "..", "..");
const CSV = path.join(
  RAIZ, "specs", "081-exames-de-laboratorio-pelo-app", "referencia", "precos-2026.csv"
);

function catalogo(): Array<{ nome: string; bio: string[] }> {
  return lerCsv(fs.readFileSync(CSV, "utf8")).map((r: Record<string, string>) => ({
    nome: nomeLimpo(r["Product name"]),
    bio: composicao(r["Tests"]),
  }));
}

describe("toda a planilha fica categorizada", () => {
  it("**nenhum dos 421 cai em `other`**", () => {
    // `other` existe como rede, não como destino. Se encher, a navegação por
    // categoria deixa de servir para a parte do catálogo que está lá.
    const sobras = catalogo()
      .filter((p) => categorizar(p.nome, p.bio) === "other")
      .map((p) => p.nome);
    expect(sobras).toEqual([]);
  });

  it("a varredura lê a planilha inteira — senão aprova o vazio", () => {
    expect(catalogo()).toHaveLength(421);
  });

  it("os 22 kits que já estavam no catálogo também não caem em `other`", () => {
    const seed = fs.readFileSync(path.join(RAIZ, "scripts", "seed-lab-products.js"), "utf8");
    const nomes = [...seed.matchAll(/name: '([^']+)', category/g)].map((m) => m[1]);
    expect(nomes.length).toBeGreaterThan(20);
    const sobras = nomes.filter((n) => categorizar(n, []) === "other");
    expect(sobras).toEqual([]);
  });
});

describe("cada categoria tem nome nas duas línguas", () => {
  it("**toda chave que as regras produzem tem rótulo**", () => {
    const semRotulo = (CHAVES as string[]).filter((c) => !LAB_CATEGORY_LABELS[c]);
    expect(semRotulo).toEqual([]);
  });

  it("e não há rótulo a mais, de categoria que já não existe", () => {
    const orfaos = Object.keys(LAB_CATEGORY_LABELS).filter((c) => !(CHAVES as string[]).includes(c));
    expect(orfaos).toEqual([]);
  });

  it("os dois idiomas estão preenchidos, e são diferentes do nome da chave", () => {
    for (const [chave, r] of Object.entries(LAB_CATEGORY_LABELS)) {
      expect(r.en.length).toBeGreaterThan(2);
      expect(r.pt.length).toBeGreaterThan(2);
      // O defeito do `sexual_health`: o rótulo em falta cai para a chave, e a
      // tela mostra um nome de variável.
      expect(r.en).not.toBe(chave);
      expect(r.pt).not.toBe(chave);
    }
  });

  it("`labCategoryLabel` responde em inglês e em português, e aguenta nulo", () => {
    expect(labCategoryLabel("thyroid", false)).toBe("Thyroid");
    expect(labCategoryLabel("thyroid", true)).toBe("Tireoide");
    expect(labCategoryLabel(null, false)).toBe("Other tests");
    expect(labCategoryLabel(null, true)).toBe("Outros exames");
  });
});

describe("a ordem das regras é a decisão, e está certa nos casos que já erraram", () => {
  // Cada linha aqui é um exame que a regra classificou mal em alguma versão
  // anterior, e a razão está no comentário. São os casos que provam que a ordem
  // e o recorte estão onde deviam.
  const casos: Array<[string, string[], string, string]> = [
    ["Brain Natriuretic Peptide (NT-pro BNP)", [], "cardiovascular",
      "'c peptide' casava dentro de 'natriuretico peptide' e isto caía em diabetes"],
    ["Anaemia Profile", ["Urea", "Ferritin", "Full Blood Count"], "haematology",
      "a composição tem ureia e isto caía em rim"],
    ["General Health Profile", ["Glucose", "Cholesterol", "ALT"], "general",
      "a composição tem glicose e isto caía em diabetes"],
    ["Heart Health Profile", ["HbA1c", "Cholesterol"], "cardiovascular",
      "'health profile' era padrão do geral e roubava este"],
    ["Factor V of Leiden", [], "coagulation",
      "é genética e coagulação; quem procura pensa em trombose"],
    ["Prostate Profile", ["Total PSA", "Free PSA"], "tumour_markers",
      "a sigla PSA não aparece no nome, só na composição"],
    ["Erectile Dysfunction Impotence Profile", ["TSH", "Testosterone"], "hormones",
      "a composição tem TSH e isto caía em tiroide"],
    ["Reverse T3", [], "thyroid", "faltava o padrão e caía em other"],
    ["Chlamydia & Gonorrhoea PCR", [], "sexual_health",
      "é infecção, mas quem procura pensa em saúde sexual"],
  ];

  for (const [nome, bio, esperado, porque] of casos) {
    it(`${nome} → ${esperado} (${porque})`, () => {
      expect(categorizar(nome, bio)).toBe(esperado);
    });
  }
});

describe("o nome do exame pesa mais que a composição", () => {
  it("**um painel é classificado pelo nome, mesmo quando a composição diz outra coisa**", () => {
    // É a regra de desempate inteira: o nome é a intenção de quem pede o exame,
    // a composição é como ele é feito.
    const comNomeDeCoracao = categorizar("Heart Health Profile", ["HbA1c", "Glucose", "Insulin"]);
    expect(comNomeDeCoracao).toBe("cardiovascular");

    // E sem nome que diga nada, a composição decide — senão tudo cairia em `other`.
    const semNomeUtil = categorizar("Profile 7", ["HbA1c", "Glucose"]);
    expect(semNomeUtil).toBe("diabetes");
  });

  it("as regras `soNome` não olham a composição", () => {
    // 'biochemistry' é padrão do painel geral. Se um exame tiver a palavra na
    // lista de marcadores, não deve virar "geral" por causa disso.
    const soNome = (REGRAS as Array<{ chave: string; soNome?: boolean }>).filter((r) => r.soNome);
    expect(soNome.length).toBeGreaterThan(0);
    expect(categorizar("Ferritin", ["biochemistry panel"])).not.toBe("general");
  });
});

describe("a ambiguidade fica visível, não escondida", () => {
  it("`todasAsCategorias` mostra todas as regras que um exame casaria", () => {
    // Um exame que casa várias regras tem a categoria decidida pela **ordem** da
    // lista. Isso tem de ser inspecionável por quem revê, em vez de ficar
    // enterrado no primeiro `return`.
    const todas = todasAsCategorias("General Health Profile", ["Glucose", "Cholesterol", "Urea"]);
    expect(todas.length).toBeGreaterThan(1);
    expect(todas[0]).toBe(categorizar("General Health Profile", ["Glucose", "Cholesterol", "Urea"]));
  });
});
