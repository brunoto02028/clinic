import { palette, spacing, radius, fontSize, fontWeight } from "./tokens";

/**
 * Semantic theme. Two color schemes (light/dark) mapping brand tokens to roles.
 * Components read from `theme.colors.*` so dark mode is a single switch.
 */
export interface ThemeColors {
  background: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  secondary: string;
  border: string;
  danger: string;
  dangerText: string;
}

const light: ThemeColors = {
  background: palette.white,
  surface: palette.white,
  surfaceMuted: palette.ink100,
  text: palette.ink,
  textMuted: palette.ink500,
  primary: palette.slate,
  primaryText: palette.white,
  secondary: palette.turquoise,
  border: palette.ink300,
  danger: palette.danger,
  dangerText: palette.white,
};

const dark: ThemeColors = {
  background: palette.ink,
  surface: palette.ink800,
  surfaceMuted: palette.ink700,
  text: palette.ink100,
  textMuted: palette.slateLight,
  primary: palette.turquoise,
  primaryText: palette.ink,
  secondary: palette.slate,
  border: palette.ink700,
  danger: palette.danger,
  dangerText: palette.white,
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
