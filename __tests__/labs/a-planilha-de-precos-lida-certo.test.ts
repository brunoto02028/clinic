/**
 * @jest-environment node
 *
 * A planilha de preços da LML lida certo (081 T-13).
 *
 * São 421 exames e uma linha mal lida não dá erro: dá um preço no campo do
 * prazo, e um exame de £164 anunciado como "6 dias" passa a anunciar outra
 * coisa. O defeito seria silencioso e chegaria ao paciente como informação
 * errada, que é a pior forma de ele chegar.
 *
 * O teste exerce `scripts/lml-price-list-parse.js` — **as funções que o
 * carregador usa**, não uma cópia delas — e o CSV real que está versionado no
 * repo.
 */

import * as fs from "fs";
import * as path from "path";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { lerCsv, dinheiro, prazoEmDias, composicao } = require("../../scripts/lml-price-list-parse.js");

const CSV = path.join(
  __dirname,
  "..",
  "..",
  "specs",
  "081-exames-de-laboratorio-pelo-app",
  "referencia",
  "precos-2026.csv"
);

describe("o leitor de CSV respeita as aspas", () => {
  it("**uma vírgula dentro de aspas não parte a linha**", () => {
    // É o defeito inteiro. A coluna `Tests` lista a composição do painel
    // separada por vírgulas, dentro de aspas; um split(',') desloca todas as
    // colunas seguintes e o preço vira o prazo.
    const texto = [
      "Code,Product name,2026 WholesalePrice,2026 RRP,TAT,Tests",
      '5HI,5 HIAA,£164.05,£275.00,6 days,"Urine Volume (24 Hour Collection), 5-OH Indole Acetic Acid (5 HIAA)"',
    ].join("\n");
    const [r] = lerCsv(texto);
    expect(r["2026 RRP"]).toBe("£275.00");
    expect(r["TAT"]).toBe("6 days");
    expect(composicao(r["Tests"])).toHaveLength(2);
  });

  it("aspas duplas escapadas viram uma aspa", () => {
    const texto = ['a,b', 'x,"diz ""olá"" aqui"'].join("\n");
    expect(lerCsv(texto)[0]["b"]).toBe('diz "olá" aqui');
  });

  it("linha vazia no fim não vira registo", () => {
    expect(lerCsv("a,b\n1,2\n\n")).toHaveLength(1);
  });
});

describe("o prazo", () => {
  it("entende dia, semana e mês", () => {
    expect(prazoEmDias("1 day")).toBe(1);
    expect(prazoEmDias("6 days")).toBe(6);
    expect(prazoEmDias("2 weeks")).toBe(14);
    expect(prazoEmDias("1 month")).toBe(30);
  });

  it("**devolve `null` quando não entende, nunca um palpite**", () => {
    // Chutar um prazo é pior que não mostrar nenhum: a pessoa planeia a vida
    // pelo número que a gente escreve. Três dos 421 caem aqui.
    for (const ilegivel of ["", "TBC", "varies", "ask lab", "0 days"]) {
      expect(prazoEmDias(ilegivel)).toBeNull();
    }
  });
});

describe("o dinheiro", () => {
  it("tira a libra e o separador de milhar", () => {
    expect(dinheiro("£164.05")).toBe(164.05);
    expect(dinheiro("£2,866.00")).toBe(2866);
  });

  it("devolve `null` em vez de zero quando não é número", () => {
    // Zero seria um preço. `null` é a ausência de preço, e a diferença decide
    // se um exame pode ser vendido.
    for (const nada of ["", "-", "POA", "£"]) expect(dinheiro(nada)).toBeNull();
  });
});

describe("a planilha real, como está no repo", () => {
  const linhas = (): Array<Record<string, string>> => lerCsv(fs.readFileSync(CSV, "utf8"));

  it("tem 421 exames, com código e nome em todos", () => {
    const rs = linhas();
    expect(rs).toHaveLength(421);
    expect(rs.filter((r) => !r["Code"] || !r["Product name"])).toEqual([]);
  });

  it("nenhum código repetido — é a chave da reconciliação com a API", () => {
    const codigos = linhas().map((r) => r["Code"]);
    expect(codigos).toHaveLength(new Set(codigos).size);
  });

  it("todo exame tem os dois preços", () => {
    const semPreco = linhas()
      .filter((r) => dinheiro(r["2026 WholesalePrice"]) === null || dinheiro(r["2026 RRP"]) === null)
      .map((r) => r["Code"]);
    expect(semPreco).toEqual([]);
  });

  it("**o `LEM` vende abaixo do custo** — o único, e por isso entra inativo", () => {
    // Se um dia a planilha vier corrigida, este teste cai e é bom que caia: a
    // razão de o produto nascer inativo deixou de existir.
    const abaixo = linhas()
      .filter((r) => {
        const c = dinheiro(r["2026 WholesalePrice"]);
        const v = dinheiro(r["2026 RRP"]);
        return c !== null && v !== null && v <= c;
      })
      .map((r) => r["Code"]);
    expect(abaixo).toEqual(["LEM"]);
  });

  it("os 22 kits que já estavam no catálogo **não** estão nesta planilha", () => {
    // São dois catálogos: os kits de consumo (códigos `X…`, picada no dedo) e a
    // lista de parceiro. Sobreposição zero de código — e é por isso que carregar
    // esta planilha dá 443 produtos, não 421. A mesma medição aparece em dois
    // deles com preços diferentes (B12 a £39 e a £59), e resolver isso é da
    // T-15, não daqui.
    const seed = fs.readFileSync(path.join(__dirname, "..", "..", "scripts", "seed-lab-products.js"), "utf8");
    const codigosDoSeed = [...seed.matchAll(/code: '([^']+)'/g)].map((m) => m[1]);
    expect(codigosDoSeed.length).toBeGreaterThan(20);
    const daPlanilha = new Set(linhas().map((r) => r["Code"]));
    expect(codigosDoSeed.filter((c) => daPlanilha.has(c))).toEqual([]);
  });
});
