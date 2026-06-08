import { type ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/useTheme";

export interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: t.colors.surface,
          borderRadius: t.radius.lg,
          borderWidth: 1,
          borderColor: t.colors.border,
          padding: t.spacing.lg,
          gap: t.spacing.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
