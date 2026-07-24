import { type ReactNode } from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import { Text } from "./Text";
import { useTheme } from "@/theme/useTheme";

export interface ListItemProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  last?: boolean;
  style?: ViewStyle;
}

export function ListItem({ icon, title, subtitle, right, onPress, last, style }: ListItemProps) {
  const t = useTheme();

  const content = (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 11,
          paddingVertical: 11,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: "#EEEDE9",
        },
        style,
      ]}
    >
      {icon}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="label" style={{ fontSize: 12 }}>{title}</Text>
        {subtitle ? (
          <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 1 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        {content}
      </Pressable>
    );
  }

  return content;
}
