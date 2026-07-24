import { View } from "react-native";
import { Text } from "./Text";
import { useTheme } from "@/theme/useTheme";

type PillVariant = "ok" | "warn" | "bad" | "work" | "health" | "community" | "muted";

export interface PillProps {
  label: string;
  variant?: PillVariant;
}

export function Pill({ label, variant = "muted" }: PillProps) {
  const t = useTheme();

  const colorMap: Record<PillVariant, { bg: string; fg: string }> = {
    ok: { bg: t.colors.okSoft, fg: t.colors.ok },
    warn: { bg: t.colors.warnSoft, fg: t.colors.warn },
    bad: { bg: t.colors.badSoft, fg: t.colors.bad },
    work: { bg: t.colors.workSoft, fg: t.colors.work },
    health: { bg: t.colors.healthSoft, fg: t.colors.health },
    community: { bg: t.colors.communitySoft, fg: t.colors.community },
    muted: { bg: "#F0EFEB", fg: "#9AA0AC" },
  };

  const c = colorMap[variant];

  return (
    <View
      style={{
        backgroundColor: c.bg,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 9999,
      }}
    >
      <Text
        style={{
          fontSize: 9,
          fontFamily: "Inter_700Bold",
          color: c.fg,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
