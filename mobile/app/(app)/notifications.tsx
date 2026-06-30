import { View, Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchNotifications } from "@/api/notifications";
import { useTheme } from "@/theme/useTheme";

const ICON_MAP: Record<string, { icon: string; color: string }> = {
  appointment: { icon: "calendar-outline", color: "#5dc9c0" },
  screening: { icon: "clipboard-outline", color: "#60a5fa" },
  profile: { icon: "person-outline", color: "#f59e0b" },
  payment: { icon: "card-outline", color: "#8b5cf6" },
  task: { icon: "checkbox-outline", color: "#34d399" },
};

export default function Notifications() {
  const t = useTheme();
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
  });

  const notifications = data?.notifications ?? [];
  const unread = data?.unreadCount ?? 0;

  return (
    <Screen scroll testID="notifications-screen">
      <Stack.Screen
        options={{ headerShown: true, title: "Notificações", headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }}
      />
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text variant="title">Notificações</Text>
          {unread > 0 && (
            <View style={{ backgroundColor: "rgba(239,68,68,0.15)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
              <Text variant="caption" color="#f87171" style={{ fontWeight: "700", fontSize: 11 }}>{unread}</Text>
            </View>
          )}
        </View>

        {isLoading ? (
          <Spinner center />
        ) : notifications.length === 0 ? (
          <Card>
            <View style={{ alignItems: "center", gap: 12, paddingVertical: 24 }}>
              <Ionicons name="notifications-off-outline" size={48} color={t.colors.textMuted} />
              <Text variant="subtitle" color={t.colors.textSecondary}>Tudo em dia!</Text>
              <Text variant="caption" color={t.colors.textMuted}>Nenhuma notificação pendente.</Text>
            </View>
          </Card>
        ) : (
          <View style={{ gap: 8 }}>
            {notifications.map((notif) => {
              const iconInfo = ICON_MAP[notif.type] ?? { icon: "notifications-outline", color: "#64748b" };
              return (
                <Pressable
                  key={notif.id}
                  onPress={() => notif.link ? router.push(notif.link) : null}
                  style={({ pressed }) => ({
                    flexDirection: "row", gap: 12, padding: 14,
                    backgroundColor: pressed ? "rgba(74,124,138,0.12)" : notif.isUrgent ? "rgba(239,68,68,0.04)" : "transparent",
                    borderRadius: 12,
                    borderLeftWidth: notif.isUrgent ? 3 : 0,
                    borderLeftColor: "#f87171",
                  })}
                >
                  <View style={{
                    width: 42, height: 42, borderRadius: 12,
                    backgroundColor: `${iconInfo.color}15`,
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Ionicons name={iconInfo.icon as any} size={20} color={iconInfo.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="label" style={{ fontWeight: "600" }}>
                      {notif.titlePt || notif.title}
                    </Text>
                    <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 2, lineHeight: 18 }}>
                      {notif.messagePt || notif.message}
                    </Text>
                  </View>
                  {notif.isUrgent && <Ionicons name="alert-circle" size={16} color="#f87171" />}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </Screen>
  );
}
