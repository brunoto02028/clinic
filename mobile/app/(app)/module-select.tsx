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

const ROUTE_MAP: Record<AppModule["key"], string> = {
  lab: "/(app)/(lab)/(tabs)",
  clinica: "/(app)/(clinica)/(tabs)",
  ba: "/(app)/(ba)/(tabs)",
};

export default function ModuleSelect() {
  const t = useTheme();
  const setActiveModule = useModule((s) => s.setActiveModule);
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  const { data: rawModules, isLoading, isError, refetch } = useQuery({
    queryKey: ["modules"],
    queryFn: fetchModules,
  });

  // The app binary and the API deploy independently. An older API (or a
  // rollback of it) still answers with `treino`/`avaliacoes`/`nutricao`, whose
  // route groups this build removed — ROUTE_MAP lookup would be undefined and
  // router.replace would throw, unprompted, inside the auto-select effect.
  const modules = rawModules?.filter((m) => m.key in ROUTE_MAP);

  useEffect(() => {
    if (modules && modules.length === 1) {
      const m = modules[0];
      setActiveModule(m.key);
      router.replace(ROUTE_MAP[m.key] as any);
    }
  }, [modules]);

  // A studio student reaches this app with no modules at all: their training,
  // assessments and nutrition screens were removed here (activity 069) and
  // the studio gets its own app. Say so instead of showing an empty chooser.
  const noModules = !!modules && modules.length === 0;

  const onSelect = (mod: AppModule) => {
    setActiveModule(mod.key);
    router.replace(ROUTE_MAP[mod.key] as any);
  };

  // A failed lookup is not an empty entitlement list: without this the screen
  // fell through to a chooser with zero cards and no way forward. Only when
  // there is nothing cached, though — TanStack keeps `data` through a failed
  // refetch, and blocking on that would strand a user who has a perfectly
  // good answer in hand.
  if (isError && !modules) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#20242D" }}>
        <View style={{ flex: 1, paddingHorizontal: 28, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="cloud-offline-outline" size={40} color="#8A8F9A" />
          <Text
            style={{
              fontFamily: "Sora_600SemiBold",
              fontSize: 18,
              color: "#FFFFFF",
              textAlign: "center",
              marginTop: 20,
            }}
          >
            We could not load your areas
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              color: "#8A8F9A",
              textAlign: "center",
              marginTop: 10,
              lineHeight: 20,
            }}
          >
            Check your connection and try again.
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={({ pressed }) => ({
              marginTop: 24,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: pressed ? "#2A2E38" : "#262A33",
              borderWidth: 1,
              borderColor: "#33373F",
            })}
          >
            <Text style={{ fontFamily: "Sora_600SemiBold", fontSize: 14, color: "#FFFFFF" }}>
              Try again
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (noModules) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#20242D" }}>
        <View style={{ flex: 1, paddingHorizontal: 28, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="phone-portrait-outline" size={40} color="#8A8F9A" />
          <Text
            style={{
              fontFamily: "Sora_600SemiBold",
              fontSize: 18,
              color: "#FFFFFF",
              textAlign: "center",
              marginTop: 20,
            }}
          >
            Your studio is getting its own app
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              color: "#8A8F9A",
              textAlign: "center",
              marginTop: 10,
              lineHeight: 20,
            }}
          >
            Your workouts, assessments and meal plans moved out of this app. Use
            the web for now — your trainer will tell you when the new app is ready.
          </Text>

          {/* Without this the screen is a dead end: module-select is the only
              route a user with no modules can reach, so they could never sign
              out — not even to let someone else use the phone. */}
          <Pressable
            onPress={() => logout()}
            style={({ pressed }) => ({
              marginTop: 28,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: pressed ? "#2A2E38" : "#262A33",
              borderWidth: 1,
              borderColor: "#33373F",
            })}
          >
            <Text style={{ fontFamily: "Sora_600SemiBold", fontSize: 14, color: "#FFFFFF" }}>
              Sign out
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

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
