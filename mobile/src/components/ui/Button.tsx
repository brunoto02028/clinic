import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
} from "react-native";
import { Text } from "./Text";
import { useTheme } from "@/theme/useTheme";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends Omit<PressableProps, "style"> {
  title: string;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
}

export function Button({
  title,
  variant = "primary",
  loading,
  disabled,
  ...rest
}: ButtonProps) {
  const t = useTheme();
  const isDisabled = disabled || loading;

  const bg = {
    primary: t.colors.primary,
    secondary: t.colors.secondary,
    ghost: "transparent",
    danger: t.colors.danger,
  }[variant];

  const fg = {
    primary: t.colors.primaryText,
    secondary: t.colors.primaryText,
    ghost: t.colors.primary,
    danger: t.colors.dangerText,
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
          borderWidth: variant === "ghost" ? 1 : 0,
          borderColor: t.colors.primary,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text variant="label" color={fg} style={styles.label}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48, // comfortable touch target
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontWeight: "600" },
});
