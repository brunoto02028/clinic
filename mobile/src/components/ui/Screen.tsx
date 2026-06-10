import { type ReactNode } from "react";
import { ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/theme/useTheme";

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export function Screen({ children, scroll, padded = true, style, testID }: ScreenProps) {
  const t = useTheme();
  const inner: ViewStyle = {
    flex: scroll ? undefined : 1,
    padding: padded ? t.spacing.xl : 0,
    backgroundColor: t.colors.background,
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: t.colors.background }]}
      testID={testID}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={[inner, style]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[inner, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
});
