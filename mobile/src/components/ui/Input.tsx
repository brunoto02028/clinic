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
  icon?: React.ReactNode;
}

export function Input({ label, error, icon, style, ...rest }: InputProps) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="label" color={t.colors.textSecondary} style={styles.label}>
          {label}
        </Text>
      ) : null}
      <View style={{ position: "relative" }}>
        {icon ? (
          <View style={{ position: "absolute", left: 12, top: 0, bottom: 0, justifyContent: "center", zIndex: 1 }}>
            {icon}
          </View>
        ) : null}
        <TextInput
          placeholderTextColor={t.colors.textMuted}
          style={[
            styles.input,
            {
              color: t.colors.text,
              backgroundColor: t.colors.surface,
              fontFamily: "Inter_400Regular",
              borderColor: error
                ? t.colors.danger
                : focused
                ? t.colors.primary
                : t.colors.border,
              borderRadius: t.radius.sm,
            },
            icon ? { paddingLeft: 38 } : undefined,
            style,
          ]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
      </View>
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
  label: { marginLeft: 2, marginTop: 8, marginBottom: 5 },
  input: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    fontSize: 12,
  },
  error: { marginLeft: 2 },
});
