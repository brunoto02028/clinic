jest.mock("@/lib/db", () => ({ prisma: {} }));

import { lerCodigo } from "../helpers/codigo";
import { decodificar, emBlocos, emTextoSimples } from "@/lib/rich-text-blocks";

/**
 * O artigo que dava para ler (28/09/2026).
 *
 * ## O que o Bruno viu no telefone
 *
 * ```
 * <h2><span style="background-color: transparent; color: rgb(0, 0,
 * 0);">Confidence&nbsp;isn&#39;t&nbsp;the&nbsp;same&nbsp;as&nbsp;correctness</…
 * ```
 *
 * O corpo do material é HTML — vem do editor do site — e a tela o entregava a
 * um `<Text>`, que desenha o que recebe, letra por letra. O paciente lia o
 * código-fonte, e nenhuma imagem aparecia.
 */

const DO_EDITOR = `<h2><span style="background-color: transparent; color: rgb(0, 0, 0);">Confidence&nbsp;isn&#39;t&nbsp;the&nbsp;same&nbsp;as&nbsp;correctness</span></h2><p><span style="color: rgb(0, 0, 0);">It&#39;s&nbsp;tempting&nbsp;to&nbsp;think&nbsp;of&nbsp;medical&nbsp;consensus&nbsp;as&nbsp;a&nbsp;straight&nbsp;line.</span></p>`;

describe("o que o editor do site produz", () => {
  const blocos = emBlocos(DO_EDITOR);

  it("**vira título e parágrafo, não marcação**", () => {
    expect(blocos).toHaveLength(2);
    expect(blocos[0]).toEqual({
      tipo: "titulo",
      nivel: 2,
      texto: "Confidence isn't the same as correctness",
    });
  });

  it("**e nenhuma tag sobrevive no texto**", () => {
    for (const b of blocos) {
      const texto = "texto" in b ? b.texto : "";
      expect(texto).not.toMatch(/<[a-z/]/i);
      expect(texto).not.toMatch(/&nbsp;|&#39;|style=/);
    }
  });

  it("o `&nbsp;` vira espaço de verdade", () => {
    // Eram dezenas por parágrafo — uma parede de entidades na tela.
    expect(decodificar("a&nbsp;b&#39;c&amp;d")).toBe("a b'c&d");
  });

  it("e dois espaços seguidos não viram buraco", () => {
    expect(emBlocos("<p>a&nbsp;&nbsp;&nbsp;b</p>")[0]).toEqual({
      tipo: "paragrafo",
      texto: "a b",
    });
  });
});

describe("as outras coisas que um artigo tem", () => {
  it("lista com marcador e lista numerada", () => {
    const b = emBlocos("<ul><li>um</li><li>dois</li></ul><ol><li>a</li></ol>");
    expect(b[0]).toEqual({ tipo: "lista", itens: ["um", "dois"], ordenada: false });
    expect(b[1]).toEqual({ tipo: "lista", itens: ["a"], ordenada: true });
  });

  it("**imagem, que era o que mais faltava**", () => {
    const b = emBlocos('<p>antes</p><img src="/img/a.png" alt="Uma foto"><p>depois</p>');
    expect(b[1]).toEqual({ tipo: "imagem", url: "/img/a.png", legenda: "Uma foto" });
  });

  it("figura com legenda", () => {
    const b = emBlocos('<figure><img src="/x.png"><figcaption>A legenda</figcaption></figure>');
    expect(b[0]).toEqual({ tipo: "imagem", url: "/x.png", legenda: "A legenda" });
  });

  it("citação e separador", () => {
    const b = emBlocos("<blockquote>uma frase</blockquote><hr>");
    expect(b[0]).toEqual({ tipo: "citacao", texto: "uma frase" });
    expect(b[1]).toEqual({ tipo: "separador" });
  });

  it("`<br>` quebra linha em vez de colar as palavras", () => {
    expect(emBlocos("<p>um<br>dois</p>")[0]).toEqual({ tipo: "paragrafo", texto: "um\ndois" });
  });
});

describe("o que não pode acontecer", () => {
  it("**texto solto fora de tag não some**", () => {
    // Existem artigos escritos sem `<p>`. Perder o corpo seria pior que
    // mostrá-lo com marcação.
    const b = emBlocos("<h2>Título</h2>Um texto solto aqui.");
    expect(b).toHaveLength(2);
    expect(b[1]).toEqual({ tipo: "paragrafo", texto: "Um texto solto aqui." });
  });

  it("texto puro, sem tag nenhuma, continua sendo parágrafo", () => {
    const b = emBlocos("Primeiro.\n\nSegundo.");
    expect(b).toEqual([
      { tipo: "paragrafo", texto: "Primeiro." },
      { tipo: "paragrafo", texto: "Segundo." },
    ]);
  });

  it("título vazio de editor não vira linha em branco", () => {
    expect(emBlocos("<h2></h2><p>corpo</p>")).toHaveLength(1);
  });

  it("corpo ausente devolve lista vazia, não estoura", () => {
    expect(emBlocos(null)).toEqual([]);
    expect(emBlocos("")).toEqual([]);
  });

  it("e o texto simples serve para resumo", () => {
    expect(emTextoSimples(DO_EDITOR)).toContain("Confidence isn't the same as correctness");
    expect(emTextoSimples(DO_EDITOR)).not.toMatch(/<|&nbsp;/);
  });
});

describe("a tela do paciente", () => {
  const rota = lerCodigo("app", "api", "education", "route.ts");
  const tela = lerCodigo("mobile", "app", "(app)", "(clinica)", "education", "[id].tsx");
  const bloco = lerCodigo("mobile", "src", "components", "ArtigoEmBlocos.tsx");

  it("o corpo sai do servidor já em blocos", () => {
    // Num lugar só: a web continua usando o HTML como sempre usou.
    expect(rota).toMatch(/blocks: emBlocos\(c\.body \|\| c\.content\)/);
  });

  it("**a tela desenha os blocos, e não o HTML**", () => {
    expect(tela).toMatch(/<ArtigoEmBlocos blocos=\{item\.blocks\} \/>/);
  });

  it("**e mostra a capa, que sempre veio e ninguém desenhava**", () => {
    expect(tela).toMatch(/item\.thumbnailUrl \?/);
  });

  it("o corpo cru continua como queda, se os blocos faltarem", () => {
    // Um material escrito à mão, sem HTML, não pode sumir por causa disto.
    expect(tela).toMatch(/item\.body \|\| item\.content/);
  });

  it("imagem dentro do artigo é desenhada", () => {
    expect(bloco).toMatch(/case "imagem"/);
    expect(bloco).toMatch(/source=\{\{ uri: b\.url \}\}/);
  });

  it("e os seis tipos de bloco têm desenho", () => {
    for (const t of ["titulo", "paragrafo", "lista", "citacao", "imagem", "separador"]) {
      expect(bloco).toContain(`case "${t}"`);
    }
  });
});
