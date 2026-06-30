import { View, Pressable, Dimensions } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/store/auth";
import { useTheme } from "@/theme/useTheme";
import { Text, Spinner } from "@/components/ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect } from "react";

const { width } = Dimensions.get("window");

export default function Welcome() {
  const t = useTheme();
  const status = useAuth((s) => s.status);

  // If already authenticated, go straight to home
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/(app)/(tabs)");
    }
  }, [status]);

  if (status === "loading") {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.background, alignItems: "center", justifyContent: "center" }}>
        <Spinner size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
      <View style={{ flex: 1, justifyContent: "space-between", paddingHorizontal: 24 }}>
        {/* Top decorative elements */}
        <View style={{ alignItems: "center", paddingTop: 40 }}>
          {/* Floating icons */}
          <View style={{ width: width * 0.7, height: width * 0.7, position: "relative" }}>
            {/* Center logo */}
            <View style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: [{ translateX: -50 }, { translateY: -50 }],
              width: 100,
              height: 100,
              borderRadius: 30,
              overflow: "hidden",
            }}>
              <LinearGradient
                colors={["#1a3a45", "#4a7c8a"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 100,
                  height: 100,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 30,
                  borderWidth: 1.5,
                  borderColor: "rgba(93, 201, 192, 0.3)",
                }}
              >
                <Ionicons name="body-outline" size={44} color="#5dc9c0" />
              </LinearGradient>
            </View>

            {/* Floating accent icons */}
            <View style={{
              position: "absolute", top: 10, left: 20,
              width: 48, height: 48, borderRadius: 16,
              backgroundColor: "rgba(74, 124, 138, 0.12)",
              borderWidth: 1, borderColor: "rgba(74, 124, 138, 0.15)",
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name="fitness-outline" size={22} color="#5dc9c0" />
            </View>
            <View style={{
              position: "absolute", top: 30, right: 10,
              width: 48, height: 48, borderRadius: 16,
              backgroundColor: "rgba(93, 201, 192, 0.1)",
              borderWidth: 1, borderColor: "rgba(93, 201, 192, 0.15)",
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name="heart-outline" size={22} color="#5dc9c0" />
            </View>
            <View style={{
              position: "absolute", bottom: 40, left: 5,
              width: 44, height: 44, borderRadius: 14,
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              borderWidth: 1, borderColor: "rgba(59, 130, 246, 0.15)",
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name="medical-outline" size={20} color="#60a5fa" />
            </View>
            <View style={{
              position: "absolute", bottom: 20, right: 30,
              width: 44, height: 44, borderRadius: 14,
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              borderWidth: 1, borderColor: "rgba(16, 185, 129, 0.15)",
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name="pulse-outline" size={20} color="#34d399" />
            </View>
          </View>
        </View>

        {/* Bottom content */}
        <View style={{ gap: 32, paddingBottom: 40 }}>
          {/* CTA arrow */}
          <View style={{ alignItems: "center" }}>
            <Pressable
              onPress={() => router.push("/login")}
              style={({ pressed }) => ({
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: pressed ? "rgba(93, 201, 192, 0.25)" : "rgba(93, 201, 192, 0.15)",
                borderWidth: 1.5,
                borderColor: "rgba(93, 201, 192, 0.3)",
                alignItems: "center",
                justifyContent: "center",
                transform: [{ scale: pressed ? 0.95 : 1 }],
              })}
            >
              <Ionicons name="arrow-forward" size={28} color="#5dc9c0" />
            </Pressable>
          </View>

          {/* Text */}
          <View style={{ gap: 12 }}>
            <Text variant="hero" color={t.colors.text} style={{ textAlign: "center" }}>
              Cuidado confiável{"\n"}para sua saúde
            </Text>
            <Text
              variant="body"
              color={t.colors.textSecondary}
              style={{ textAlign: "center", lineHeight: 22, paddingHorizontal: 16 }}
            >
              Conecte-se com seus profissionais e{"\n"}acompanhe sua jornada de reabilitação
            </Text>
          </View>

          {/* Buttons */}
          <View style={{ gap: 12 }}>
            <Pressable
              onPress={() => router.push("/login")}
              style={({ pressed }) => ({
                overflow: "hidden",
                borderRadius: 14,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <LinearGradient
                colors={["#4a7c8a", "#2c4f58"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingVertical: 16,
                  borderRadius: 14,
                  alignItems: "center",
                }}
              >
                <Text variant="label" color="#ffffff" style={{ fontWeight: "700", fontSize: 16 }}>
                  Entrar na conta
                </Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => router.push("/login")}
              style={({ pressed }) => ({
                paddingVertical: 16,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "rgba(107, 163, 176, 0.3)",
                alignItems: "center",
                backgroundColor: pressed ? "rgba(74, 124, 138, 0.08)" : "transparent",
              })}
            >
              <Text variant="label" color={t.colors.accent} style={{ fontWeight: "600", fontSize: 16 }}>
                Criar conta
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
