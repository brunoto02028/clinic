import { ActivityIndicator, View } from "react-native";
import { useTheme } from "@/theme/useTheme";

export interface SpinnerProps {
  size?: "small" | "large";
  center?: boolean;
}

export function Spinner({ size = "large", center }: SpinnerProps) {
  const t = useTheme();
  const indicator = <ActivityIndicator size={size} color={t.colors.primary} />;
  if (!center) return indicator;
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      {indicator}
    </View>
  );
}
