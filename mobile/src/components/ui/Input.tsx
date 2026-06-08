import { useState } from "react";
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { Text } from "./Text";
import { useTheme } from "@/theme/useTheme";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...rest }: InputProps) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="label" muted style={styles.label}>
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={t.colors.textMuted}
        style={[
          styles.input,
          {
            color: t.colors.text,
            backgroundColor: t.colors.surfaceMuted,
            borderColor: error
              ? t.colors.danger
              : focused
              ? t.colors.primary
              : t.colors.border,
            borderRadius: t.radius.md,
          },
          style,
        ]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...rest}
      />
      {error ? (
        <Text variant="caption" color={t.colors.danger} style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", gap: 6 },
  label: { marginLeft: 2 },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    fontSize: 16,
  },
  error: { marginLeft: 2 },
});
