import { View, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/useTheme";

export interface TriBarProps {
  work?: boolean;
  health?: boolean;
  community?: boolean;
  style?: ViewStyle;
}

export function TriBar({ work, health, community, style }: TriBarProps) {
  const t = useTheme();
  const empty = t.colors.border;

  return (
    <View style={[{ flexDirection: "row", gap: 4 }, style]}>
      <View
        style={{
          flex: 1,
          height: 5,
          borderRadius: 3,
          backgroundColor: work ? t.colors.work : empty,
        }}
      />
      <View
        style={{
          flex: 1,
          height: 5,
          borderRadius: 3,
          backgroundColor: health ? t.colors.health : empty,
        }}
      />
      <View
        style={{
          flex: 1,
          height: 5,
          borderRadius: 3,
          backgroundColor: community ? t.colors.community : empty,
        }}
      />
    </View>
  );
}
