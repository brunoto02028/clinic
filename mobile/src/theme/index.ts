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

export const themes = { light };

export const theme = {
  spacing,
  radius,
  fontSize,
  fontWeight,
  palette,
};

export { palette, spacing, radius, fontSize, fontWeight };
