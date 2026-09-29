/**
 * @jest-environment node
 *
 * A marcação dentro do parágrafo (107 T-4).
 *
 * O paciente lia, nas referências:
 *   Banks, K. (2013) _Maitland's Peripheral Manipulation Management._ Elsevier.
 * com os sublinhados na tela.
 */
import { textoEmPedacos, temMarcacao } from "../../mobile/src/lib/texto-em-pedacos";

/** O texto visível, para provar que nada some nem aparece no caminho. */
const juntar = (t: string) => textoEmPedacos(t).map((p) => p.texto).join("");
const estilos = (t: string) => textoEmPedacos(t).map((p) => `${p.estilo}:${p.texto}`);

describe("o que vira formatação", () => {
  it("**a referência de verdade, que originou isto**", () => {
    const r = textoEmPedacos("Banks, K. (2013) _Maitland's Peripheral Manipulation Management._ Elsevier.");
    expect(r).toEqual([
      { texto: "Banks, K. (2013) ", estilo: "normal" },
      { texto: "Maitland's Peripheral Manipulation Management.", estilo: "italico" },
      { texto: " Elsevier.", estilo: "normal" },
    ]);
  });

  it("`_x_` vira itálico e os sublinhados somem da tela", () => {
    expect(estilos("veja _isto_ aqui")).toEqual(["normal:veja ", "italico:isto", "normal: aqui"]);
    expect(juntar("veja _isto_ aqui")).not.toContain("_");
  });

  it("`**x**` vira negrito", () => {
    expect(estilos("muito **importante** mesmo")).toEqual([
      "normal:muito ", "negrito:importante", "normal: mesmo",
    ]);
  });

  it("`*x*` também é itálico", () => {
    expect(estilos("um *pouco* assim")).toEqual(["normal:um ", "italico:pouco", "normal: assim"]);
  });

  it("negrito e itálico no mesmo parágrafo", () => {
    expect(estilos("**a** e _b_")).toEqual(["negrito:a", "normal: e ", "italico:b"]);
  });

  it("dois itálicos seguidos não viram um só", () => {
    expect(estilos("_a_ x _b_")).toEqual(["italico:a", "normal: x ", "italico:b"]);
  });
});

describe("o que **não** pode virar formatação", () => {
  it("**`snake_case` continua literal**", () => {
    // Material técnico tem `campo_id` e `snake_case`. Transformar em itálico
    // come sublinhados que eram parte do texto.
    expect(temMarcacao("use snake_case aqui")).toBe(false);
    expect(juntar("use snake_case aqui")).toBe("use snake_case aqui");
  });

  it("um identificador com dois sublinhados também", () => {
    expect(juntar("campo_id_externo")).toBe("campo_id_externo");
    expect(estilos("campo_id_externo")).toEqual(["normal:campo_id_externo"]);
  });

  it("**marcação não fechada sai como está**", () => {
    // Fechar por conta própria muda o texto de quem escreveu, e aqui o texto
    // é clínico.
    expect(juntar("peso de 5_10 kg e mais")).toBe("peso de 5_10 kg e mais");
    expect(juntar("um ** solto")).toBe("um ** solto");
    expect(juntar("_abre e nunca fecha")).toBe("_abre e nunca fecha");
  });

  it("asterisco de multiplicação não vira itálico", () => {
    expect(juntar("3 * 4 * 5")).toBe("3 * 4 * 5");
  });

  it("a marcação não atravessa a quebra de linha", () => {
    expect(juntar("_abre\ne fecha_ depois")).toBe("_abre\ne fecha_ depois");
  });
});

describe("ênfase dentro de texto já inclinado", () => {
  const blocos = require("fs").readFileSync(
    require("path").join(process.cwd(), "mobile", "src", "components", "ArtigoEmBlocos.tsx"),
    "utf8"
  );

  it("**a citação avisa que já é itálica**", () => {
    /**
     * Achado do QA (29/09/2026): o bloco de citação inteiro é itálico, então
     * `_título da obra_` saía itálico dentro de itálico — indistinguível. A
     * convenção tipográfica é a ênfase voltar ao normal, e é a única que se
     * enxerga.
     */
    expect(blocos).toMatch(/paiItalico/);
    // e o parâmetro só é passado onde o pai é de fato itálico
    const naCitacao = blocos.slice(blocos.indexOf('case "citacao"'), blocos.indexOf('case "imagem"'));
    expect(naCitacao).toMatch(/paiItalico/);
    const noParagrafo = blocos.slice(blocos.indexOf('case "paragrafo"'), blocos.indexOf('case "lista"'));
    expect(noParagrafo).not.toMatch(/paiItalico/);
  });
});

describe("nada some e nada aparece", () => {
  const exemplos = [
    "Banks, K. (2013) _Maitland's Vertebral Manipulation Management._ Elsevier.",
    "Sharkey, J. (2017) _The Concise Book of Dry Needling._ Lotus Publishing.",
    "use snake_case e **cuidado**",
    "sem marcação alguma",
    "3 * 4 e _isto_",
  ];

  it.each(exemplos)("o texto visível de %p é o original menos as marcas", (t) => {
    const semMarcas = t.replace(/\*\*([^\n*]+?)\*\*/g, "$1")
                       .replace(/(?<![\w*])\*([^\n*]+?)\*(?![\w*])/g, "$1")
                       .replace(/(?<![\w_])_([^\n_]+?)_(?![\w_])/g, "$1");
    expect(juntar(t)).toBe(semMarcas);
  });

  it("texto sem marcação devolve um pedaço só", () => {
    expect(textoEmPedacos("sem nada")).toEqual([{ texto: "sem nada", estilo: "normal" }]);
  });

  it("vazio, nulo e indefinido devolvem lista vazia", () => {
    expect(textoEmPedacos("")).toEqual([]);
    expect(textoEmPedacos(null)).toEqual([]);
    expect(textoEmPedacos(undefined)).toEqual([]);
  });

  it("`temMarcacao` não fica preso no estado do padrão global", () => {
    // Um `RegExp` global guarda `lastIndex` entre chamadas: sem zerar, a
    // segunda pergunta sobre o mesmo texto responderia diferente.
    const t = "com _marca_ aqui";
    expect(temMarcacao(t)).toBe(true);
    expect(temMarcacao(t)).toBe(true);
  });
});
