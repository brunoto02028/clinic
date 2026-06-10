import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { useTheme } from "@/theme/useTheme";

type Variant = "title" | "subtitle" | "body" | "caption" | "label" | "hero";

export interface TextProps extends RNTextProps {
  variant?: Variant;
  muted?: boolean;
  color?: string;
}

const SIZES: Record<Variant, { size: number; weight: "400" | "500" | "600" | "700" }> = {
  hero: { size: 34, weight: "700" },
  title: { size: 28, weight: "700" },
  subtitle: { size: 18, weight: "600" },
  body: { size: 15, weight: "400" },
  label: { size: 14, weight: "500" },
  caption: { size: 12, weight: "400" },
};

export function Text({ variant = "body", muted, color, style, ...rest }: TextProps) {
  const t = useTheme();
  const v = SIZES[variant];
  return (
    <RNText
      style={[
        {
          fontSize: v.size,
          fontWeight: v.weight,
          color: color ?? (muted ? t.colors.textMuted : t.colors.text),
          ...(variant === "hero" ? { letterSpacing: -0.5 } : {}),
          ...(variant === "title" ? { letterSpacing: -0.3 } : {}),
        },
        style,
      ]}
      {...rest}
    />
  );
}
