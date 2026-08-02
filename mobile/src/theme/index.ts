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
  textMuted: palette.muted,
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
