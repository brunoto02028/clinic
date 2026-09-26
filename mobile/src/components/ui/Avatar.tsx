import { useState } from "react";
import { View, Image, type ViewStyle } from "react-native";
import { Text } from "./Text";
import { useTheme } from "@/theme/useTheme";
import type { Pillar } from "@/theme/tokens";

export interface AvatarProps {
  label: string;
  /** A foto do paciente. Sem ela, ficam as iniciais. */
  uri?: string | null;
  pillar?: Pillar;
  round?: boolean;
  size?: number;
  style?: ViewStyle;
}

export function Avatar({ label, uri, pillar, round, size = 36, style }: AvatarProps) {
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
  // Sobre `primary`, que é bone no escuro: branco sobre bone é 1,10:1.
  const fg = pillar ? fgMap[pillar] : t.colors.primaryFg;

  const radius = round ? 9999 : 11;
  // Objeto apagado no storage, domínio fora do ar: sem isto sobrava um círculo
  // vazio. As iniciais são um retrato pior e uma falha melhor.
  const [broken, setBroken] = useState(false);

  if (uri && !broken) {
    return (
      <Image
        source={{ uri }}
        style={[{ width: size, height: size, borderRadius: radius }, style as object]}
        accessibilityLabel={label}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
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
