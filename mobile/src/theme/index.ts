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
