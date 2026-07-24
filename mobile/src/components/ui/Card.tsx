import { type ReactNode } from "react";
import { View, type ViewStyle, Platform } from "react-native";
import { useTheme } from "@/theme/useTheme";
import type { Pillar } from "@/theme/tokens";

export interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  accent?: Pillar;
  dark?: boolean;
}

export function Card({ children, style, accent, dark }: CardProps) {
  const t = useTheme();

  const accentColorMap: Record<Pillar, string> = {
    work: t.colors.work,
    health: t.colors.health,
    community: t.colors.community,
  };

  return (
    <View
      style={[
        {
          backgroundColor: dark ? t.colors.primary : t.colors.surface,
          borderRadius: t.radius.md,
          borderWidth: dark ? 0 : 1,
          borderColor: t.colors.border,
          borderTopWidth: accent ? 3 : dark ? 0 : 1,
          borderTopColor: accent ? accentColorMap[accent] : t.colors.border,
          padding: 13,
          gap: t.spacing.sm,
          ...Platform.select({
            ios: {
              shadowColor: t.colors.cardShadow,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 1,
              shadowRadius: 3,
            },
            android: {
              elevation: 1,
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
