import { palette, spacing, radius, fontSize, fontWeight } from "./tokens";

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryFg: string;
  greige: string;
  greigeFg: string;
  greigePress: string;
  accent: string;
  border: string;
  borderSubtle: string;

  work: string;
  workSoft: string;

  /**
   * A cor do texto **em cima de um acento** — verde, azul, âmbar, vermelho.
   *
   * Existe porque a sua falta era o defeito: `#FFFFFF` estava cravado em
   * `Button`, `Avatar`, no chip de idioma e no badge da foto. Branco sobre o
   * verde escuro do claro dá 5,31:1; sobre o verde **clareado** do escuro dá
   * **2,66:1**, e o rótulo do botão principal some (QA da 086, 26/09/2026).
   *
   * E não bastava trocar por tinta: no escuro ink sobre acento dá 5,82–6,80,
   * mas no claro reprova em 2,17–3,05. Ou seja, o valor certo **depende do
   * tom** — que é a definição de token. Não faltava cor nova; faltava o par
   * ter nome.
   */
  accentFg: string;

  /**
   * A versão apagada de `accentFg` — legenda, hora da mensagem, sobrerrótulo.
   *
   * Existe pelo mesmo motivo que `accentFg`, e ela sozinha não bastava:
   * `rgba(255,255,255,0.75)` em cima do verde clareado do escuro dá ~1,4:1, e a
   * hora da mensagem enviada desaparece dentro da própria bolha.
   */
  accentFgSoft: string;

  /**
   * O trilho e o botão do controle segmentado.
   *
   * São **dois** tokens porque a relação entre eles se inverte entre os tons:
   * no claro o trilho é um bege recuado e o botão é o card branco, saliente; no
   * escuro o trilho é a superfície e o botão é um degrau **mais claro** que ela
   * — é o único jeito de o selecionado parecer levantado sobre fundo escuro.
   * Cravados, davam botão `#FFFFFF` sobre trilho `#FFFFFF`: 1,10:1, o
   * selecionado invisível (QA da 086).
   */
  segmentTrack: string;
  segmentThumb: string;

  /**
   * O acento do laboratório — o sage e o âmbar (086, T-2).
   *
   * Decisão do Bruno: *"as telas do laboratório, quando for o tom escuro, têm
   * que ficar com a identidade proporcionada."* Aquele verde é o que faz a tela
   * parecer cuidada em vez de genérica, e ele não some no escuro — muda de
   * valor mantendo o matiz.
   *
   * Vive no tema, e não em constantes dentro de cinco telas, porque uma cor
   * declarada em cinco lugares diverge no primeiro ajuste.
   */
  lab: string;
  labSoft: string;
  labWarm: string;
  labWarmSoft: string;
  health: string;
  healthSoft: string;
  community: string;
  communitySoft: string;

  ok: string;
  okSoft: string;
  warn: string;
  warnSoft: string;
  bad: string;
  badSoft: string;

  danger: string;
  dangerFg: string;
  success: string;
  cardShadow: string;
  secondary: string;
}

const light: ThemeColors = {
  background: palette.bone,
  surface: palette.card,
  surfaceElevated: palette.card,
  surfaceMuted: "#EBEAE6",
  text: palette.ink,
  textSecondary: "#4A4F59",
  /**
   * Era `palette.muted` (#767B85), que dá 3,86:1 sobre o fundo bege e 4,25:1
   * sobre o card — abaixo do mínimo de 4,5:1 da WCAG, em **258 nós de texto**.
   * É o cinza de legenda do app inteiro: data da medição, dose do exercício,
   * texto de apoio de cada tela.
   *
   * `#5B616C` mantém o mesmo tom neutro e passa nos três fundos. Não é um
   * token novo nem outra paleta: é o mesmo cinza, escuro o bastante para ser
   * lido por alguém de sessenta anos com dor. O `muted` original segue no
   * lugar onde ele sempre coube — bordas e ícones inativos.
   */
  textMuted: "#5B616C",
  primary: palette.ink,
  primaryFg: palette.white,
  greige: palette.greige,
  greigeFg: palette.greigeFg,
  greigePress: palette.greigePress,
  accent: palette.ink,
  border: palette.line,
  borderSubtle: "#EEEDE9",

  work: palette.work,
  workSoft: palette.workSoft,
  health: palette.health,
  healthSoft: palette.healthSoft,
  community: palette.community,
  communitySoft: palette.communitySoft,

  accentFg: palette.white,
  accentFgSoft: "rgba(255, 255, 255, 0.75)",

  segmentTrack: "#EBEAE6",
  segmentThumb: palette.card,

  lab: "#65807B",
  labSoft: "#E4EDE7",
  labWarm: "#B8823A",
  labWarmSoft: "#F5EFDD",

  ok: palette.ok,
  okSoft: palette.okSoft,
  warn: palette.warn,
  warnSoft: palette.warnSoft,
  bad: palette.bad,
  badSoft: palette.badSoft,

  danger: palette.bad,
  dangerFg: palette.white,
  success: palette.ok,
  cardShadow: "rgba(32, 36, 45, 0.06)",
  secondary: "#4A4F59",
};

/**
 * O tom escuro (086, 26/09/2026).
 *
 * Pedido do Bruno: *"nós queremos usar sempre os dois tons, o claro e o escuro.
 * Ter essas opções é extremamente importante na dinâmica e na beleza do design
 * do app."*
 *
 * **Não é o claro invertido.** Inverter cores de marca escurece o que devia
 * clarear: o `health` (#4F7361) sobre fundo escuro dá 1,9:1 — ilegível. Os
 * pilares e os estados foram **clareados mantendo o matiz**, e os "Soft", que
 * no claro são fundos pálidos, viraram fundos escuros tingidos do mesmo tom.
 *
 * O alvo é o mesmo do claro: 4,5:1 para texto, que é o mínimo da WCAG e o que
 * alguém de sessenta anos com dor consegue ler. `textMuted` (#9BA0AA) dá ~6:1
 * sobre a superfície; os pilares clareados ficam entre 5:1 e 7:1.
 *
 * O fundo é um degrau **abaixo** do `ink` de propósito, para que o card possa
 * ser o próprio `ink` e a hierarquia continue existindo — no claro, o card é
 * mais claro que o fundo; no escuro, mais claro também.
 */
const dark: ThemeColors = {
  background: "#191C23",
  surface: palette.ink,
  surfaceElevated: "#262A33",
  surfaceMuted: "#2A2E38",
  text: palette.bone,
  textSecondary: "#C9CBD1",
  textMuted: "#9BA0AA",
  primary: palette.bone,
  primaryFg: palette.ink,
  greige: "#3A3630",
  greigeFg: "#EDE9E2",
  greigePress: "#474139",
  accent: palette.bone,
  border: "#343945",
  borderSubtle: "#2A2E38",

  work: "#8FA3C4",
  workSoft: "#1E2430",
  health: "#7FA890",
  healthSoft: "#1E2A24",
  community: "#D0A468",
  communitySoft: "#2A2418",

  // Tinta sobre o acento clareado: 5,82 no `bad`, 6,80 no `community`.
  accentFg: palette.ink,
  accentFgSoft: "rgba(32, 36, 45, 0.72)",

  segmentTrack: palette.ink,
  segmentThumb: "#333845",

  // O sage e o âmbar do laboratório, clareados para o escuro. O `Soft` de cada
  // um deixa de ser fundo pálido e vira fundo escuro tingido do mesmo tom — é o
  // que preserva a identidade em vez de apagá-la.
  lab: "#8FB0A8",
  labSoft: "#1E2A27",
  labWarm: "#D9A860",
  labWarmSoft: "#2B2519",

  ok: "#84A791",
  okSoft: "#1E2A23",
  warn: "#C6A26A",
  warnSoft: "#2A2418",
  bad: "#D98A79",
  badSoft: "#2E1F1C",

  danger: "#D98A79",
  dangerFg: palette.ink,
  success: "#84A791",
  // Sombra no escuro quase não aparece; o que separa camadas é a superfície
  // mais clara, não o sombreado.
  cardShadow: "rgba(0, 0, 0, 0.45)",
  secondary: "#C9CBD1",
};

export const themes = { light, dark };

export const theme = {
  spacing,
  radius,
  fontSize,
  fontWeight,
  palette,
};

export { palette, spacing, radius, fontSize, fontWeight };
