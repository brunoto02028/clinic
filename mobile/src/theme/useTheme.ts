import { themes, theme, type ThemeColors } from "./index";

export interface Theme {
  colors: ThemeColors;
  spacing: typeof theme.spacing;
  radius: typeof theme.radius;
  fontSize: typeof theme.fontSize;
  fontWeight: typeof theme.fontWeight;
  fonts: {
    display: string;
    body: string;
  };
  scheme: "light";
}

export function useTheme(): Theme {
  return {
    colors: themes.light,
    spacing: theme.spacing,
    radius: theme.radius,
    fontSize: theme.fontSize,
    fontWeight: theme.fontWeight,
    fonts: {
      display: "Sora_700Bold",
      body: "Inter_400Regular",
    },
    scheme: "light",
  };
}
