import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { useTheme } from "@/theme/useTheme";

type Variant = "hero" | "title" | "heading" | "subtitle" | "body" | "label" | "caption" | "eyebrow";

export interface TextProps extends RNTextProps {
  variant?: Variant;
  muted?: boolean;
  color?: string;
}

const SIZES: Record<Variant, { size: number; weight: string; family: "display" | "body"; letterSpacing?: number }> = {
  hero: { size: 30, weight: "800", family: "display", letterSpacing: -1 },
  title: { size: 19, weight: "700", family: "display", letterSpacing: -0.3 },
  heading: { size: 14.5, weight: "600", family: "display" },
  subtitle: { size: 17, weight: "700", family: "display", letterSpacing: -0.2 },
  body: { size: 11.5, weight: "400", family: "body" },
  label: { size: 12, weight: "600", family: "body" },
  caption: { size: 10.5, weight: "500", family: "body" },
  eyebrow: { size: 9.5, weight: "700", family: "body", letterSpacing: 0.8 },
};

const FONT_MAP: Record<string, Record<string, string>> = {
  display: {
    "400": "Sora_400Regular",
    "500": "Sora_500Medium",
    "600": "Sora_600SemiBold",
    "700": "Sora_700Bold",
    "800": "Sora_800ExtraBold",
  },
  body: {
    "400": "Inter_400Regular",
    "500": "Inter_500Medium",
    "600": "Inter_600SemiBold",
    "700": "Inter_700Bold",
  },
};

export function Text({ variant = "body", muted, color, style, ...rest }: TextProps) {
  const t = useTheme();
  const v = SIZES[variant];
  const fontFamily = FONT_MAP[v.family]?.[v.weight] ?? (v.family === "display" ? "Sora_700Bold" : "Inter_400Regular");

  return (
    <RNText
      style={[
        {
          fontSize: v.size,
          fontFamily,
          color: color ?? (muted ? t.colors.textMuted : t.colors.text),
          letterSpacing: v.letterSpacing,
        },
        style,
      ]}
      {...rest}
    />
  );
}
