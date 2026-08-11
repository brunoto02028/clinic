import { View, Pressable } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/store/auth";
import { useTheme } from "@/theme/useTheme";
import { Text, Button, Spinner } from "@/components/ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect } from "react";

export default function Welcome() {
  const t = useTheme();
  const status = useAuth((s) => s.status);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/(app)/module-select");
    }
  }, [status]);

  if (status === "loading") {
    return (
      <View style={{ flex: 1, backgroundColor: "#20242D", alignItems: "center", justifyContent: "center" }}>
        <Spinner />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#20242D" }}>
      <View style={{ flex: 1, justifyContent: "space-between", paddingHorizontal: 20 }}>
        {/* Center: Tri-bar logo + brand */}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 18 }}>
          {/* Tri-bar mark */}
          <View style={{ flexDirection: "row", gap: 7, alignItems: "flex-end" }}>
            <View style={{ width: 13, height: 34, borderRadius: 7, backgroundColor: "#46587A" }} />
            <View style={{ width: 13, height: 48, borderRadius: 7, backgroundColor: "#8FA98F" }} />
            <View style={{ width: 13, height: 26, borderRadius: 7, backgroundColor: "#A87438" }} />
          </View>

          <Text
            style={{
              fontFamily: "Sora_800ExtraBold",
              fontSize: 30,
              color: "#FFFFFF",
              letterSpacing: -1,
            }}
          >
            BA One
          </Text>

          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 12.5,
              color: "#B9BDC6",
            }}
          >
            Your business. Your body. Your people.
          </Text>
        </View>

        {/* Bottom: CTA buttons */}
        <View style={{ gap: 14, paddingBottom: 36 }}>
          <Button
            title="Get started"
            variant="greige"
            size="lg"
            onPress={() => router.push("/register")}
          />
          <Pressable
            onPress={() => router.push("/login")}
            style={{ alignItems: "center", paddingVertical: 14 }}
          >
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11.5, color: "#8A8F9A" }}>
              Already a member?{" "}
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 11.5, color: "#FFFFFF" }}>
                Sign in
              </Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
