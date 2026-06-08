import { useColorScheme } from "react-native";
import { themes, theme, type ThemeColors } from "./index";

export interface Theme {
  colors: ThemeColors;
  spacing: typeof theme.spacing;
  radius: typeof theme.radius;
  fontSize: typeof theme.fontSize;
  fontWeight: typeof theme.fontWeight;
  scheme: "light" | "dark";
}

/** Resolves the active theme from the OS color scheme. */
export function useTheme(): Theme {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  return {
    colors: themes[scheme],
    spacing: theme.spacing,
    radius: theme.radius,
    fontSize: theme.fontSize,
    fontWeight: theme.fontWeight,
    scheme,
  };
}
