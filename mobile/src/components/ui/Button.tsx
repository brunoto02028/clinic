import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type ViewStyle,
} from "react-native";
import { Text } from "./Text";
import { useTheme } from "@/theme/useTheme";

type Variant = "primary" | "greige" | "ghost" | "danger" | "work" | "health" | "community";

export interface ButtonProps extends Omit<PressableProps, "style"> {
  title: string;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  style?: ViewStyle;
}

export function Button({
  title,
  variant = "greige",
  loading,
  disabled,
  icon,
  size = "md",
  style: outerStyle,
  ...rest
}: ButtonProps) {
  const t = useTheme();
  const isDisabled = disabled || loading;

  const heights = { sm: 36, md: 46, lg: 54 };
  const fontSizes = { sm: 12, md: 13.5, lg: 15 };

  const colorMap: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: t.colors.primary, fg: t.colors.primaryFg },
    greige: { bg: t.colors.greige, fg: t.colors.greigeFg },
    ghost: { bg: t.colors.surface, fg: t.colors.text, border: t.colors.border },
    danger: { bg: t.colors.bad, fg: "#FFFFFF" },
    work: { bg: t.colors.work, fg: "#FFFFFF" },
    health: { bg: t.colors.health, fg: "#FFFFFF" },
    community: { bg: t.colors.community, fg: "#FFFFFF" },
  };

  const c = colorMap[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: c.bg,
          borderRadius: t.radius.md,
          borderWidth: c.border ? 1.5 : 0,
          borderColor: c.border,
          minHeight: heights[size],
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        outerStyle,
      ]}
      {...rest}
    >
      <View style={styles.inner}>
        {loading ? (
          <ActivityIndicator color={c.fg} size="small" />
        ) : (
          <>
            {icon}
            <Text
              variant="label"
              color={c.fg}
              style={{
                fontFamily: "Sora_700Bold",
                fontSize: fontSizes[size],
              }}
            >
              {title}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
