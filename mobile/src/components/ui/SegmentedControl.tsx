import { Pressable, View, type ViewStyle } from "react-native";
import { Text } from "./Text";
import { useTheme } from "@/theme/useTheme";
import { Platform } from "react-native";

export interface SegmentedControlProps {
  options: string[];
  selected: number;
  onSelect: (index: number) => void;
  style?: ViewStyle;
}

export function SegmentedControl({ options, selected, onSelect, style }: SegmentedControlProps) {
  const t = useTheme();

  return (
    <View
      style={[
        {
          flexDirection: "row",
          backgroundColor: t.colors.segmentTrack,
          borderRadius: 11,
          padding: 3,
        },
        style,
      ]}
    >
      {options.map((opt, i) => {
        const isActive = i === selected;
        return (
          <Pressable
            key={opt}
            onPress={() => onSelect(i)}
            style={{
              flex: 1,
              paddingVertical: 7,
              borderRadius: 9,
              alignItems: "center",
              backgroundColor: isActive ? t.colors.segmentThumb : "transparent",
              ...Platform.select<ViewStyle>({
                ios: isActive
                  ? {
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.08,
                      shadowRadius: 3,
                    }
                  : {},
                android: isActive ? { elevation: 2 } : {},
              }),
            }}
          >
            <Text
              variant="caption"
              style={{
                fontFamily: "Inter_600SemiBold",
                // `#6A6F79` sobre o trilho dava 4,19:1 — reprovava nos **dois** tons.
                color: isActive ? t.colors.text : t.colors.textMuted,
              }}
            >
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
