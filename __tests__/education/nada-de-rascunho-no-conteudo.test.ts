/**
 * @jest-environment node
 *
 * Nada de rascunho no conteúdo que o paciente lê (107 T-3).
 *
 * Dez protocolos foram semeados com uma anotação minha no fim das referências:
 * *"TODO: add a condition-specific loading-protocol reference (from module
 * notes), Harvard format."* O Bruno viu num print do aplicativo — eu não achei,
 * foi mostrado.
 *
 * Uma referência que não existe é pior que referência nenhuma: as cinco reais,
 * logo acima, passam a ser lidas com a mesma desconfiança.
 */
import fs from "fs";
import path from "path";

const { limpar, textoVisivel } = require("../../scripts/limpar-marcas-de-rascunho");

const PROTOCOLOS = path.join(process.cwd(), "recovered-content", "protocols");

describe("a fonte não carrega marca de rascunho", () => {
  const arquivos = fs
    .readdirSync(PROTOCOLOS)
    .filter((f) => f.startsWith("protocol_") && f.endsWith(".md"));

  it("há protocolos para medir", () => {
    // Um teste que passa porque não achou arquivo nenhum não guarda nada.
    expect(arquivos.length).toBeGreaterThanOrEqual(10);
  });

  it.each(arquivos)("%s não tem marca de rascunho", (nome) => {
    const texto = fs.readFileSync(path.join(PROTOCOLOS, nome), "utf8");
    expect(texto).not.toMatch(/\b(TODO|FIXME)\b/);
  });
});

describe("a regra que reconhece a linha", () => {
  const envolver = (li: string) => `<h2>References</h2><ul><li>Banks, K. (2013)</li>${li}</ul>`;

  it("**tira o item em inglês**", () => {
    const r = limpar(envolver("<li>TODO: add a condition-specific loading-protocol reference.</li>"));
    expect(r.tirados).toBe(1);
    expect(r.html).not.toMatch(/TODO/);
  });

  it("tira o item traduzido — a redação varia, a marca não", () => {
    // Em produção a linha saiu em seis redações diferentes: foi traduzida
    // automaticamente, por linha. Procurar texto fixo pegaria uma só.
    const redacoes = [
      "TODO: adicionar uma referência específica sobre protocolo de progressão de carga para esta condição (das notas do módulo), em formato Harvard.",
      "TODO: adicionar uma referência específica sobre protocolo de carga para esta condição (das notas do módulo), em formato Harvard.",
      "TODO: adicionar uma referência específica sobre protocolo de carga para essa condição (das notas do módulo), em formato Harvard.",
    ];
    for (const r of redacoes) {
      expect(limpar(envolver(`<li>${r}</li>`))!.tirados).toBe(1);
    }
  });

  it("tira mesmo com `&nbsp;` no lugar de cada espaço", () => {
    const comNbsp = "TODO:&nbsp;add&nbsp;a&nbsp;condition-specific&nbsp;loading-protocol&nbsp;reference.";
    expect(limpar(envolver(`<li>${comNbsp}</li>`))!.tirados).toBe(1);
  });

  it("**não tira uma linha legítima que começa por 'todos'**", () => {
    // O falso positivo que eu mesmo criei ao medir: busca sem diferenciar
    // maiúsculas casa "todos os planos" com "TODO".
    const legitima = "<li>ADM ativa cervical (todos os planos — restrita/dolorosa).</li>";
    expect(limpar(envolver(legitima))).toBeNull();
  });

  it("não tira uma referência que menciona a palavra no meio", () => {
    const meio = "<li>Watson, T. (2008) Electrotherapy — see the TODO list appendix.</li>";
    expect(limpar(envolver(meio))).toBeNull();
  });

  it("as referências de verdade continuam lá", () => {
    const r = limpar(envolver("<li>TODO: qualquer coisa.</li>"));
    expect(r.html).toContain("Banks, K. (2013)");
  });

  it("conteúdo limpo devolve nulo, para não escrever à toa", () => {
    // Um `update` sem mudança ainda mexe no `updatedAt`.
    expect(limpar("<ul><li>Banks, K. (2013)</li></ul>")).toBeNull();
  });

  it("**rodar de novo não acha nada** — é idempotente", () => {
    const antes = envolver("<li>TODO: add a reference.</li>");
    const primeira = limpar(antes)!;
    expect(limpar(primeira.html)).toBeNull();
  });

  it("a lista que ficou vazia não vira moldura vazia na tela", () => {
    const so = "<h2>References</h2><ul><li>TODO: add a reference.</li></ul>";
    expect(limpar(so)!.html).not.toMatch(/<ul>\s*<\/ul>/);
  });

  it("nulo, vazio e o que não é texto não quebram", () => {
    expect(limpar(null)).toBeNull();
    expect(limpar("")).toBeNull();
    expect(limpar(undefined)).toBeNull();
    expect(limpar(42)).toBeNull();
  });

  it("o texto visível ignora marcação e espaço teimoso", () => {
    expect(textoVisivel("<b>TODO:</b>&nbsp;algo")).toBe("TODO: algo");
  });
});
