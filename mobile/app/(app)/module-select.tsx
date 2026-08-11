import { View, Pressable } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Text, Spinner } from "@/components/ui";
import { fetchModules, type AppModule } from "@/api/modules";
import { useModule } from "@/store/module";
import { useAuth } from "@/store/auth";
import { useTheme } from "@/theme/useTheme";
import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  "flask-outline": "flask-outline",
  "medkit-outline": "medkit-outline",
  "briefcase-outline": "briefcase-outline",
};

const ROUTE_MAP: Record<string, string> = {
  lab: "/(app)/(lab)/(tabs)",
  clinica: "/(app)/(clinica)/(tabs)",
  ba: "/(app)/(ba)/(tabs)",
};

export default function ModuleSelect() {
  const t = useTheme();
  const setActiveModule = useModule((s) => s.setActiveModule);
  const user = useAuth((s) => s.user);

  const { data: modules, isLoading } = useQuery({
    queryKey: ["modules"],
    queryFn: fetchModules,
  });

  useEffect(() => {
    if (modules && modules.length === 1) {
      const m = modules[0];
      setActiveModule(m.key);
      router.replace(ROUTE_MAP[m.key] as any);
    }
  }, [modules]);

  const onSelect = (mod: AppModule) => {
    setActiveModule(mod.key);
    router.replace(ROUTE_MAP[mod.key] as any);
  };

  if (isLoading || (modules && modules.length === 1)) {
    return (
      <View style={{ flex: 1, backgroundColor: "#20242D", alignItems: "center", justifyContent: "center" }}>
        <Spinner />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#20242D" }}>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 60 }}>
        <Text
          style={{
            fontFamily: "Sora_700Bold",
            fontSize: 26,
            color: "#FFFFFF",
            letterSpacing: -0.5,
            marginBottom: 6,
          }}
        >
          {user?.firstName ? `Hi, ${user.firstName}` : "Welcome"}
        </Text>
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 13,
            color: "#B9BDC6",
            marginBottom: 36,
          }}
        >
          Choose where you want to go.
        </Text>

        <View style={{ gap: 14 }}>
          {(modules || []).map((mod) => (
            <Pressable
              key={mod.key}
              onPress={() => onSelect(mod)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
                backgroundColor: pressed ? "#2A2E38" : "#262A33",
                borderRadius: 16,
                padding: 20,
                borderWidth: 1,
                borderColor: "#33373F",
              })}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: "#33373F",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name={ICON_MAP[mod.icon] || "apps-outline"}
                  size={24}
                  color="#CDC7BE"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "Sora_600SemiBold",
                    fontSize: 16,
                    color: "#FFFFFF",
                  }}
                >
                  {mod.name}
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 12,
                    color: "#8A8F9A",
                    marginTop: 2,
                  }}
                >
                  {mod.description}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#8A8F9A" />
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
