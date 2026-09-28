import { themes, theme, type ThemeColors } from "./index";
import { useThemeStore, type ModoDeCor } from "@/store/theme";

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
  scheme: ModoDeCor;
  /** Atalho para o punhado de lugares que precisam decidir um ícone ou uma sombra. */
  isDark: boolean;
}

/**
 * O tema, agora com dois tons (086).
 *
 * Isto deixou de ser uma função constante e virou **hook reativo**: ele assina
 * a preferência, então trocar o tom repinta cada tela sem remontar nada. Toda
 * tela já chamava `useTheme()`, então o app inteiro acompanha sem alteração
 * nenhuma — era esse o valor de as cores já viverem em tokens.
 *
 * Quem cravou cor no código (`#20242D` e afins) **não** acompanha, e é por isso
 * que essas telas precisaram ser convertidas junto.
 */
export function useTheme(): Theme {
  const modo = useThemeStore((s) => s.modo);
  return {
    colors: themes[modo],
    spacing: theme.spacing,
    radius: theme.radius,
    fontSize: theme.fontSize,
    fontWeight: theme.fontWeight,
    fonts: {
      display: "Sora_700Bold",
      body: "Inter_400Regular",
    },
    scheme: modo,
    isDark: modo === "dark",
  };
}
