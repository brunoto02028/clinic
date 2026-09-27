/**
 * As imagens que moram em `SiteSettings`, e não na biblioteca de imagens.
 *
 * ## Por que esta lista virou um lugar só (27/09/2026)
 *
 * Ela existia duas vezes: a rota que **lista** (`/api/image-library`) montava as
 * entradas virtuais a partir de oito campos, e a rota que **apaga**
 * (`/api/image-library/[id]`) tinha um mapa próprio, de prefixo para campo. Os
 * dois divergiram, e de três formas:
 *
 * 1. **Chave duplicada.** O mapa tinha `"settings-logo-"` duas vezes — para
 *    `logoUrl` e para `darkLogoUrl`. Num objeto literal a segunda vence, então
 *    apagar a logo clara apagava a **escura**, e a clara não tinha como ser
 *    apagada. Era o único erro de tipo que o `tsc` conseguia apontar aqui.
 * 2. **O prefixo não identifica o campo.** O id é `settings-<categoria>-<arquivo>`,
 *    e três campos compartilham a categoria `logo` (clara, escura, favicon) e
 *    dois compartilham `services` (palmilhas, biomecânica). Casar por prefixo
 *    nunca poderia distinguir — a duplicata era só o sintoma visível.
 * 3. **O favicon não estava no mapa**, então apagá-lo limpava o que
 *    `settings-logo-` calhasse de apontar.
 *
 * A identificação certa é pelo **arquivo**: o id carrega o nome do arquivo, e o
 * campo é aquele cuja URL termina nele.
 */

/** Um campo de imagem de `SiteSettings`, com a categoria que aparece na tela. */
export interface CampoDeImagem {
  campo: string;
  rotulo: string;
  categoria: string;
}

export const IMAGENS_DE_SITE_SETTINGS: CampoDeImagem[] = [
  { campo: "logoUrl", rotulo: "Logo", categoria: "logo" },
  { campo: "darkLogoUrl", rotulo: "Logo (Dark)", categoria: "logo" },
  { campo: "faviconUrl", rotulo: "Favicon", categoria: "logo" },
  { campo: "heroImageUrl", rotulo: "Hero Image", categoria: "hero" },
  { campo: "aboutImageUrl", rotulo: "About Image", categoria: "about" },
  { campo: "insolesImageUrl", rotulo: "Insoles Image", categoria: "services" },
  { campo: "bioImageUrl", rotulo: "Biomechanics Image", categoria: "services" },
  { campo: "ogImageUrl", rotulo: "OG / Social Share Image", categoria: "general" },
];

/** O nome de arquivo com que a listagem monta o id. */
export function arquivoDaUrl(url: string): string {
  return url.split("/").pop() || url;
}

/** O id virtual de uma dessas imagens, como a listagem o constrói. */
export function idVirtual(categoria: string, arquivo: string): string {
  return `settings-${categoria}-${arquivo}`;
}

/**
 * Qual campo de `SiteSettings` um id virtual identifica.
 *
 * Compara o **arquivo**, e não o prefixo, porque o prefixo só carrega a
 * categoria. Devolve `null` quando nenhum campo aponta para aquele arquivo — o
 * que acontece legitimamente quando a imagem já foi trocada por outra.
 */
export function campoDoIdVirtual(
  id: string,
  settings: Record<string, unknown>
): string | null {
  if (!id.startsWith("settings-")) return null;

  for (const { campo, categoria } of IMAGENS_DE_SITE_SETTINGS) {
    const url = settings[campo];
    if (typeof url !== "string" || !url) continue;
    if (idVirtual(categoria, arquivoDaUrl(url)) === id) return campo;
  }
  return null;
}

/** Uma logo por tela: a clara e a escura. */
export interface LogoDeTela {
  logoUrl?: string | null;
  darkLogoUrl?: string | null;
}

/**
 * O `screenLogos` de `SiteSettings`, com forma conferida.
 *
 * A coluna é `Json?`, então o Prisma a entrega como `JsonValue` — que pode ser
 * string, número, array ou `null`. A tela espera um mapa de `tela → {logoUrl,
 * darkLogoUrl}` e lia direto, o que dava erro de tipo e, no dia em que a coluna
 * tivesse outra coisa, `undefined.logoUrl` na renderização.
 *
 * Conferir aqui é mais honesto que afirmar com `as`: o que não tem a forma
 * esperada é descartado, e a tela cai no logo padrão — que é o comportamento
 * que ela já tem para tela sem logo própria.
 */
export function logosDeTela(valor: unknown): Record<string, LogoDeTela> | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;

  const saida: Record<string, LogoDeTela> = {};
  for (const [tela, entrada] of Object.entries(valor as Record<string, unknown>)) {
    if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) continue;
    const e = entrada as Record<string, unknown>;
    saida[tela] = {
      logoUrl: typeof e.logoUrl === "string" ? e.logoUrl : null,
      darkLogoUrl: typeof e.darkLogoUrl === "string" ? e.darkLogoUrl : null,
    };
  }
  return Object.keys(saida).length > 0 ? saida : null;
}
