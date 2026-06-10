import { palette, spacing, radius, fontSize, fontWeight } from "./tokens";

/**
 * Semantic theme aligned with BPR Clinic web dark UI.
 * Dark mode is the primary scheme (matching the web app).
 */
export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  secondary: string;
  secondaryText: string;
  accent: string;
  border: string;
  borderSubtle: string;
  danger: string;
  dangerText: string;
  success: string;
  warning: string;
  info: string;
  // Glass effect colors
  glassBg: string;
  glassBorder: string;
  cardShadow: string;
}

const dark: ThemeColors = {
  background: palette.ink,
  surface: "rgba(26, 39, 64, 0.8)",
  surfaceElevated: "rgba(36, 51, 82, 0.9)",
  surfaceMuted: "rgba(26, 39, 64, 0.5)",
  text: "#e2e8f0",
  textSecondary: "#94a3b8",
  textMuted: palette.ink400,
  primary: palette.primary,
  primaryText: palette.white,
  secondary: palette.turquoise,
  secondaryText: palette.ink,
  accent: palette.primaryLight,
  border: "rgba(74, 124, 138, 0.15)",
  borderSubtle: "rgba(255, 255, 255, 0.06)",
  danger: palette.danger,
  dangerText: palette.white,
  success: palette.success,
  warning: palette.warning,
  info: palette.info,
  glassBg: "rgba(13, 21, 32, 0.6)",
  glassBorder: "rgba(74, 124, 138, 0.08)",
  cardShadow: "rgba(0, 0, 0, 0.3)",
};

const light: ThemeColors = {
  background: "#f8fafc",
  surface: palette.white,
  surfaceElevated: palette.white,
  surfaceMuted: palette.ink100,
  text: palette.ink,
  textSecondary: palette.ink500,
  textMuted: palette.ink400,
  primary: palette.primary,
  primaryText: palette.white,
  secondary: palette.turquoise,
  secondaryText: palette.white,
  accent: palette.primaryLight,
  border: "rgba(0, 0, 0, 0.08)",
  borderSubtle: "rgba(0, 0, 0, 0.04)",
  danger: palette.danger,
  dangerText: palette.white,
  success: palette.success,
  warning: palette.warning,
  info: palette.info,
  glassBg: "rgba(255, 255, 255, 0.8)",
  glassBorder: "rgba(0, 0, 0, 0.06)",
  cardShadow: "rgba(0, 0, 0, 0.08)",
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
