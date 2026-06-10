import { themes, theme, type ThemeColors } from "./index";

export interface Theme {
  colors: ThemeColors;
  spacing: typeof theme.spacing;
  radius: typeof theme.radius;
  fontSize: typeof theme.fontSize;
  fontWeight: typeof theme.fontWeight;
  scheme: "light" | "dark";
}

/** Always returns dark theme to match the web app identity. */
export function useTheme(): Theme {
  return {
    colors: themes.dark,
    spacing: theme.spacing,
    radius: theme.radius,
    fontSize: theme.fontSize,
    fontWeight: theme.fontWeight,
    scheme: "dark",
  };
}
