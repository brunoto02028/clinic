import { type ReactNode } from "react";
import { View, type ViewStyle, Platform } from "react-native";
import { useTheme } from "@/theme/useTheme";

export interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  variant?: "default" | "elevated" | "highlight";
}

export function Card({ children, style, variant = "default" }: CardProps) {
  const t = useTheme();

  const bgMap = {
    default: t.colors.surface,
    elevated: t.colors.surfaceElevated,
    highlight: "rgba(74, 124, 138, 0.12)",
  };

  const borderMap = {
    default: t.colors.borderSubtle,
    elevated: t.colors.border,
    highlight: "rgba(93, 201, 192, 0.2)",
  };

  return (
    <View
      style={[
        {
          backgroundColor: bgMap[variant],
          borderRadius: t.radius.lg,
          borderWidth: 1,
          borderColor: borderMap[variant],
          padding: t.spacing.lg,
          gap: t.spacing.sm,
          ...Platform.select({
            ios: {
              shadowColor: t.colors.cardShadow,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
            },
            android: {
              elevation: 4,
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
