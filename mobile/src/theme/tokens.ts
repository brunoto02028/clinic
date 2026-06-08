/**
 * Design tokens derived from the web app's Tailwind config (BPR brand).
 * Brand: slate #607d7d (primary), turquoise #5dc9c0 (secondary),
 * dark surface #0f172a (used by splash/status bar on the Capacitor build).
 */

export const palette = {
  // Brand
  slate: "#607d7d",
  slateDark: "#4a6363",
  slateLight: "#7a9494",
  turquoise: "#5dc9c0",
  turquoiseDark: "#4ab3ab",
  turquoiseLight: "#7dd4cd",

  // Neutrals (slate scale aligned with the web dark surfaces)
  ink: "#0f172a",
  ink800: "#1e293b",
  ink700: "#334155",
  ink500: "#64748b",
  ink300: "#cbd5e1",
  ink100: "#f1f5f9",
  white: "#ffffff",
  black: "#000000",

  // Feedback
  danger: "#dc2626",
  dangerLight: "#fecaca",
  success: "#16a34a",
  warning: "#d97706",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  full: 9999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  "2xl": 28,
  "3xl": 34,
} as const;

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;
