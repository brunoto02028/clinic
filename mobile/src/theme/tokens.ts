/**
 * Design tokens aligned with the BPR Clinic web app's dark futuristic theme.
 * Brand: teal #4a7c8a (primary), turquoise #5dc9c0 (secondary),
 * dark surface #0f172a, glassmorphism effects.
 */

export const palette = {
  // Brand — aligned with web CSS variables
  primary: "#4a7c8a",
  primaryDark: "#2c4f58",
  primaryLight: "#6ba3b0",
  turquoise: "#5dc9c0",
  turquoiseDark: "#4ab3ab",
  turquoiseLight: "#7dd4cd",

  // Bruno brand (kept for compat)
  slate: "#607d7d",
  slateDark: "#4a6363",
  slateLight: "#7a9494",

  // Dark surfaces — matching web hsl(200 35% 7%) etc.
  ink: "#0d1520",
  ink900: "#111b2b",
  ink800: "#1a2740",
  ink700: "#243352",
  ink600: "#2e3f5e",
  ink500: "#64748b",
  ink400: "#8494a7",
  ink300: "#cbd5e1",
  ink200: "#e2e8f0",
  ink100: "#f1f5f9",
  white: "#ffffff",
  black: "#000000",

  // Neon accents (for glows/shadows)
  neonCyan: "rgba(74, 124, 138, 0.4)",
  neonCyanStrong: "rgba(93, 201, 192, 0.5)",

  // Feedback
  danger: "#ef4444",
  dangerLight: "#fca5a5",
  success: "#10b981",
  successLight: "#a7f3d0",
  warning: "#f59e0b",
  warningLight: "#fde68a",
  info: "#3b82f6",
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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
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
