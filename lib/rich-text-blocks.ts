/**
 * HTML de artigo virando blocos que o aplicativo sabe desenhar (28/09/2026).
 *
 * ## O que aconteceu
 *
 * O Bruno atribuiu um artigo a um paciente e a tela do telefone mostrou isto:
 *
 * ```
 * <h2><span style="background-color: transparent; color: rgb(0, 0,
 * 0);">Confidence&nbsp;isn&#39;t&nbsp;the&nbsp;same&nbsp;as&nbsp;correctness</…
 * ```
 *
 * O corpo do artigo é **HTML** — vem do editor do site — e a tela o entregava
 * a um `<Text>`, que desenha o que recebe, letra por letra. O paciente lia o
 * código-fonte.
 *
 * ## Por que blocos, e não HTML renderizado
 *
 * Renderizar HTML exigiria um `WebView` ou uma biblioteca de HTML — e nas duas
 * o texto sai com a tipografia do HTML, não com a do aplicativo. Um artigo
 * clínico dentro de uma moldura que não é a do app parece um site embutido.
 *
 * Blocos deixam o telefone desenhar com a fonte, o espaçamento e as cores da
 * casa, e sobrevivem ao modo escuro.
 *
 * ## O que este arquivo não tenta ser
 *
 * Não é um parser de HTML. É uma tradução do que o editor do site de fato
 * produz: títulos, parágrafos, listas, imagens, citações e regras. Tag
 * desconhecida vira o texto dela — nunca some, e nunca aparece como marcação.
 */

export type Bloco =
  | { tipo: "titulo"; nivel: 1 | 2 | 3; texto: string }
  | { tipo: "paragrafo"; texto: string }
  | { tipo: "lista"; itens: string[]; ordenada: boolean }
  | { tipo: "citacao"; texto: string }
  | { tipo: "imagem"; url: string; legenda?: string }
  | { tipo: "separador" };

const ENTIDADES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
};

/**
 * `&nbsp;` e `&#39;` estavam aparecendo literalmente na tela.
 *
 * O editor do site grava espaços como `&nbsp;` — dezenas por parágrafo —, e
 * sem esta passagem o texto vira uma parede de entidades.
 */
export function decodificar(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, nome) => ENTIDADES[nome.toLowerCase()] ?? m);
}

/** Tira a marcação de dentro de um bloco e devolve o texto limpo. */
function textoDe(html: string): string {
  return decodificar(
    html
      // `<br>` é quebra de linha, não ausência de espaço.
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?[^>]+>/g, "")
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function itensDaLista(html: string): string[] {
  return [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((m) => textoDe(m[1]))
    .filter(Boolean);
}

/**
 * Os blocos de um corpo de artigo.
 *
 * Texto solto entre tags vira parágrafo: um artigo escrito sem `<p>` — e
 * existem — não pode sumir da tela.
 */
export function emBlocos(html: string | null | undefined): Bloco[] {
  if (!html || typeof html !== "string") return [];

  // Sem tag nenhuma é texto puro: separa por linha em branco e pronto.
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return decodificar(html)
      .split(/\n{2,}/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((texto) => ({ tipo: "paragrafo" as const, texto }));
  }

  const blocos: Bloco[] = [];
  const padrao =
    /<(h[1-6]|p|ul|ol|blockquote|hr|img|figure|div)\b([^>]*)>([\s\S]*?)<\/\1>|<(hr|img)\b([^>]*)\/?>/gi;

  let m: RegExpExecArray | null;
  let ultimo = 0;

  const soltoEntre = (ate: number) => {
    const solto = textoDe(html.slice(ultimo, ate));
    if (solto) blocos.push({ tipo: "paragrafo", texto: solto });
  };

  while ((m = padrao.exec(html)) !== null) {
    soltoEntre(m.index);
    ultimo = m.index + m[0].length;

    const tag = (m[1] || m[4] || "").toLowerCase();
    const atributos = m[2] || m[5] || "";
    const dentro = m[3] ?? "";

    if (tag === "hr") {
      blocos.push({ tipo: "separador" });
      continue;
    }

    if (tag === "img") {
      const src = /src\s*=\s*["']([^"']+)["']/i.exec(atributos)?.[1];
      const alt = /alt\s*=\s*["']([^"']*)["']/i.exec(atributos)?.[1];
      if (src) blocos.push({ tipo: "imagem", url: src, legenda: alt ? decodificar(alt) : undefined });
      continue;
    }

    if (/^h[1-6]$/.test(tag)) {
      const texto = textoDe(dentro);
      // Um `<h2></h2>` vazio de editor não vira um título em branco na tela.
      if (!texto) continue;
      const n = Number(tag[1]);
      blocos.push({ tipo: "titulo", nivel: (n <= 1 ? 1 : n === 2 ? 2 : 3) as 1 | 2 | 3, texto });
      continue;
    }

    if (tag === "ul" || tag === "ol") {
      const itens = itensDaLista(dentro);
      if (itens.length) blocos.push({ tipo: "lista", itens, ordenada: tag === "ol" });
      continue;
    }

    if (tag === "blockquote") {
      const texto = textoDe(dentro);
      if (texto) blocos.push({ tipo: "citacao", texto });
      continue;
    }

    // `p`, `figure` e `div`: o que houver de imagem dentro, e depois o texto.
    // Um `<figure>` com imagem e legenda é o caso comum do editor.
    const imgDentro = /<img\b([^>]*)>/i.exec(dentro);
    if (imgDentro) {
      const src = /src\s*=\s*["']([^"']+)["']/i.exec(imgDentro[1])?.[1];
      if (src) {
        const legenda = textoDe(dentro.replace(/<img\b[^>]*>/i, ""));
        blocos.push({ tipo: "imagem", url: src, legenda: legenda || undefined });
        continue;
      }
    }

    const texto = textoDe(dentro);
    if (texto) blocos.push({ tipo: "paragrafo", texto });
  }

  soltoEntre(html.length);
  return blocos;
}

/** O texto corrido, para resumo e busca — sem marcação e sem entidades. */
export function emTextoSimples(html: string | null | undefined): string {
  return emBlocos(html)
    .map((b) =>
      b.tipo === "lista" ? b.itens.join("\n") : "texto" in b ? b.texto : ""
    )
    .filter(Boolean)
    .join("\n\n");
}
