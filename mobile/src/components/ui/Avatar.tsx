import { View, type ViewStyle } from "react-native";
import { Text } from "./Text";
import { useTheme } from "@/theme/useTheme";
import type { Pillar } from "@/theme/tokens";

export interface AvatarProps {
  label: string;
  pillar?: Pillar;
  round?: boolean;
  size?: number;
  style?: ViewStyle;
}

export function Avatar({ label, pillar, round, size = 36, style }: AvatarProps) {
  const t = useTheme();

  const bgMap: Record<Pillar, string> = {
    work: t.colors.workSoft,
    health: t.colors.healthSoft,
    community: t.colors.communitySoft,
  };

  const fgMap: Record<Pillar, string> = {
    work: t.colors.work,
    health: t.colors.health,
    community: t.colors.community,
  };

  const bg = pillar ? bgMap[pillar] : t.colors.primary;
  const fg = pillar ? fgMap[pillar] : "#FFFFFF";

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: round ? 9999 : 11,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Text
        style={{
          fontSize: size * 0.38,
          fontFamily: "Inter_700Bold",
          color: fg,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
