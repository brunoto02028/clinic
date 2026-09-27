import { ler, lerCodigo } from "../helpers/codigo";

/**
 * A cor do botão que conclui (095 T-4, 27/09/2026).
 *
 * O Bruno: *"O botão no app do exercício, Mark As Done, está marrom e está com
 * uma leitura muito ruim."*
 *
 * ## O que a medição mostrou
 *
 * O botão vinha na variante **padrão** do `Button`, que é `greige` — e greige é
 * `#CDC7BE` no tema claro, um bege quente que se lê como marrom. Mas o texto
 * dentro dele estava em **9,42:1**, muito acima do exigido. Então não era
 * legibilidade de texto.
 *
 * Era o **botão sumindo no fundo**:
 *
 * | | contra o fundo | texto |
 * |---|---|---|
 * | greige, tema claro | **1,53:1** | 9,42:1 |
 * | greige, tema escuro | **1,29:1** | — |
 * | health (moss) claro | 4,82:1 | 5,31:1 |
 * | health (moss) escuro | 5,85:1 | 5,85:1 |
 *
 * A regra para um controle é **3:1 contra o que está atrás dele** (WCAG 1.4.11).
 * A 1,5:1 ele não parece um botão; parece um retângulo bege sobre um fundo
 * bege. E `health` é o moss da própria clínica.
 *
 * Medi a atual **antes** de trocar. Já troquei uma cor aqui anunciando melhora
 * e entreguei 4,9 → 3,2, que é por que isto virou regra.
 */

/** Contraste WCAG entre duas cores hex. */
function contraste(a: string, b: string): number {
  const lum = (h: string) => {
    const v = h.replace("#", "");
    const [r, g, bl] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
    const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl);
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const tokens = ler("mobile", "src", "theme", "tokens.ts");
const tema = ler("mobile", "src", "theme", "index.ts");
const exercicio = lerCodigo("mobile", "app", "(app)", "(clinica)", "exercise", "[id].tsx");
const educacao = lerCodigo("mobile", "app", "(app)", "(clinica)", "education", "[id].tsx");

/** O valor de um token, lido do arquivo — para o teste medir o que existe. */
function token(src: string, nome: string): string {
  const m = src.match(new RegExp(`${nome}:\\s*"(#[0-9A-Fa-f]{6})"`));
  if (!m) throw new Error(`não achei o token ${nome}`);
  return m[1];
}

describe("a cor que estava lá", () => {
  it("greige some no fundo claro — é o que o Bruno viu", () => {
    const greige = token(tokens, "greige");
    const bone = token(tokens, "bone");
    expect(contraste(greige, bone)).toBeLessThan(2);
  });

  it("e o texto dentro dela estava ótimo — não era legibilidade", () => {
    // Guardado porque é o que explica a confusão: quem medisse só o texto
    // concluiria que estava tudo certo.
    expect(contraste(token(tokens, "greige"), token(tokens, "greigeFg"))).toBeGreaterThan(7);
  });
});

describe("a cor que entrou", () => {
  it("o moss da clínica passa dos 3:1 contra o fundo, nos dois temas", () => {
    const moss = token(tokens, "health"); // #4F7361, tema claro
    expect(contraste(moss, token(tokens, "bone"))).toBeGreaterThan(3);

    // No escuro o tema redefine `health`; o fundo é o ink.
    const healthEscuro = tema.match(/health:\s*"(#[0-9A-Fa-f]{6})"/)![1];
    expect(contraste(healthEscuro, token(tokens, "ink"))).toBeGreaterThan(3);
  });

  it("e o texto dentro dele passa dos 4,5:1", () => {
    expect(contraste(token(tokens, "health"), "#FFFFFF")).toBeGreaterThan(4.5);
    const healthEscuro = tema.match(/health:\s*"(#[0-9A-Fa-f]{6})"/)![1];
    expect(contraste(healthEscuro, token(tokens, "ink"))).toBeGreaterThan(4.5);
  });
});

describe("e ela está nos botões de concluir", () => {
  it("o do exercício", () => {
    expect(exercicio).toMatch(/variant="health"/);
    // O ícone acompanha o texto: `primaryFg` era do outro fundo.
    expect(exercicio).toMatch(/color=\{t\.colors\.accentFg\}/);
  });

  it("e o do conteúdo, que é a mesma ação", () => {
    expect(educacao).toMatch(/variant="health"/);
  });
});
