import { type ReactNode } from "react";
import { View, type ViewStyle, Platform } from "react-native";
import { useTheme } from "@/theme/useTheme";
import type { Pillar } from "@/theme/tokens";

/**
 * `highlight` and `elevated` existed in eight call sites before they existed
 * here. `variant` was not in `CardProps`, so TypeScript flagged each one and
 * React Native dropped it: every card that asked to stand out rendered flat,
 * including the safety notice on the screening wizard and the "next step" card
 * on the assessment progress. Adding the prop here fixes all eight at once.
 */
export type CardVariant = "default" | "highlight" | "elevated";

export interface CardProps {
  testID?: string;
  children: ReactNode;
  style?: ViewStyle;
  accent?: Pillar;
  dark?: boolean;
  variant?: CardVariant;
}

export function Card({ children, style, accent, dark, variant = "default", testID }: CardProps) {
  const t = useTheme();
  const highlight = variant === "highlight";
  const elevated = variant === "elevated";

  const accentColorMap: Record<Pillar, string> = {
    work: t.colors.work,
    health: t.colors.health,
    community: t.colors.community,
  };

  return (
    <View testID={testID}
      style={[
        {
          backgroundColor: dark
            ? t.colors.primary
            : highlight
              ? t.colors.surfaceMuted
              : t.colors.surface,
          borderRadius: t.radius.md,
          borderWidth: dark ? 0 : 1,
          borderColor: highlight || elevated ? t.colors.health : t.colors.border,
          borderTopWidth: accent ? 3 : dark ? 0 : 1,
          borderTopColor: accent ? accentColorMap[accent] : t.colors.border,
          padding: 13,
          gap: t.spacing.sm,
          ...Platform.select({
            ios: {
              shadowColor: t.colors.cardShadow,
              shadowOffset: { width: 0, height: elevated ? 3 : 1 },
              shadowOpacity: 1,
              shadowRadius: elevated ? 8 : 3,
            },
            android: {
              elevation: elevated ? 4 : 1,
            },
          }),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
