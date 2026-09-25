import { View, Pressable } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/store/auth";
import { useTheme } from "@/theme/useTheme";
import { Text, Button, Spinner, Logo } from "@/components/ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect } from "react";

export default function Welcome() {
  const t = useTheme();
  const status = useAuth((s) => s.status);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/(app)/module-select");
    }
    // Nada a fazer com `locked`: a cortina da raiz já está por cima, e
    // navegar para cá ou para lá por baixo dela só embaralharia o histórico.
  }, [status]);

  if (status === "loading" || status === "locked") {
    return (
      <View style={{ flex: 1, backgroundColor: "#20242D", alignItems: "center", justifyContent: "center" }}>
        <Spinner />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#20242D" }}>
      <View style={{ flex: 1, justifyContent: "space-between", paddingHorizontal: 20 }}>
        {/* Center: brand logo */}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 18 }}>
          {/* The artwork carries the wordmark, so no "BPR" text beside it. */}
          <Logo tone="bone" height={132} />

          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 12.5,
              color: "#B9BDC6",
            }}
          >
            Your recovery, step by step.
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
