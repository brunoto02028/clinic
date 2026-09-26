import { Pressable, type ViewStyle } from "react-native";
import { Text } from "./Text";
import { useTheme } from "@/theme/useTheme";

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  accentColor?: string;
  style?: ViewStyle;
}

export function Chip({ label, selected, onPress, accentColor, style }: ChipProps) {
  const t = useTheme();

  const bg = selected ? (accentColor ?? t.colors.primary) : t.colors.surface;
  const fg = selected ? t.colors.primaryFg : t.colors.textSecondary;
  const border = selected ? (accentColor ?? t.colors.primary) : t.colors.border;

  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: border,
          borderRadius: 9999,
          paddingHorizontal: 10,
          paddingVertical: 5,
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
        },
        style,
      ]}
    >
      <Text
        variant="caption"
        style={{
          // Cravava 10,5 e por isso não acompanhou a subida da escala. Sai do
          // `caption` como todo rótulo pequeno do app; só o peso é próprio.
          fontFamily: "Inter_600SemiBold",
          color: fg,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
