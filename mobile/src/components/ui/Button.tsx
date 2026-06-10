import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "./Text";
import { useTheme } from "@/theme/useTheme";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";

export interface ButtonProps extends Omit<PressableProps, "style"> {
  title: string;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Button({
  title,
  variant = "primary",
  loading,
  disabled,
  icon,
  size = "md",
  ...rest
}: ButtonProps) {
  const t = useTheme();
  const isDisabled = disabled || loading;

  const heights = { sm: 40, md: 48, lg: 56 };
  const fontSizes = { sm: 13, md: 15, lg: 17 };

  const fg = {
    primary: t.colors.primaryText,
    secondary: t.colors.text,
    ghost: t.colors.accent,
    danger: t.colors.dangerText,
    outline: t.colors.accent,
  }[variant];

  const content = (
    <View style={styles.inner}>
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <>
          {icon}
          <Text
            variant="label"
            color={fg}
            style={{ fontWeight: "600", fontSize: fontSizes[size] }}
          >
            {title}
          </Text>
        </>
      )}
    </View>
  );

  if (variant === "primary") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
        disabled={isDisabled}
        style={({ pressed }) => ({
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          borderRadius: t.radius.md,
          overflow: "hidden" as const,
        })}
        {...rest}
      >
        <LinearGradient
          colors={["#4a7c8a", "#2c4f58"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.base,
            {
              minHeight: heights[size],
              borderRadius: t.radius.md,
            },
          ]}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  const bg = {
    secondary: "rgba(74, 124, 138, 0.12)",
    ghost: "transparent",
    danger: t.colors.danger,
    outline: "transparent",
  }[variant];

  const borderColor = {
    secondary: "rgba(74, 124, 138, 0.2)",
    ghost: "transparent",
    danger: "transparent",
    outline: "rgba(107, 163, 176, 0.3)",
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderRadius: t.radius.md,
          borderWidth: 1,
          borderColor,
          minHeight: heights[size],
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      {...rest}
    >
      {content}
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
