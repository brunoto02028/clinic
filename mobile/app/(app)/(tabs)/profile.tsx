import { View, Pressable } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, Text, Card, Avatar, ListItem, Spinner } from "@/components/ui";
import { fetchProfile } from "@/api/profile";
import { fetchSubscription } from "@/api/extras";
import { useAuth } from "@/store/auth";
import { useTheme } from "@/theme/useTheme";
import type { Pillar } from "@/theme/tokens";

const MENU_ACCOUNT: {
  label: string;
  emoji: string;
  pillar: Pillar;
  path: string;
}[] = [
  { label: "My business", emoji: "💼", pillar: "work", path: "/business-settings" },
  { label: "My health record", emoji: "🩺", pillar: "health", path: "/health-records" },
  { label: "My public profile", emoji: "◉", pillar: "community", path: "/public-profile" },
];

const MENU_SETTINGS: {
  label: string;
  emoji: string;
  path: string;
}[] = [
  { label: "Language", emoji: "🌐", path: "/language" },
  { label: "Notifications", emoji: "🔔", path: "/notifications" },
  { label: "Membership", emoji: "⭐", path: "/membership" },
  { label: "Privacy & data", emoji: "🔒", path: "/privacy" },
];

export default function Profile() {
  const t = useTheme();
  const logout = useAuth((s) => s.logout);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });

  const { data: subData } = useQuery({
    queryKey: ["subscription"],
    queryFn: fetchSubscription,
  });

  const onLogout = async () => {
    await logout();
    router.replace("/");
  };

  const initials = data
    ? `${data.firstName?.[0] ?? ""}${data.lastName?.[0] ?? ""}`.toUpperCase()
    : "?";

  const fullName = data ? `${data.firstName} ${data.lastName}` : "";

  const sub = subData?.subscription;
  const planName = sub?.plan?.name ?? "BA One Pro";
  const planPrice = sub?.plan?.price != null
    ? `£${(sub.plan.price / 100).toFixed(2)}/mo`
    : "£14.99/mo";

  return (
    <Screen scroll testID="profile-screen">
      <View style={{ gap: 20 }}>
        <Text variant="title">Profile</Text>

        {isLoading ? (
          <Spinner center />
        ) : isError || !data ? (
          <Card>
            <Text color={t.colors.danger}>Unable to load profile.</Text>
          </Card>
        ) : (
          <>
            {/* ── Profile card ── */}
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <Avatar label={initials} round size={56} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="subtitle" testID="profile-name">
                    {fullName}
                  </Text>
                  <Text
                    variant="caption"
                    color={t.colors.textMuted}
                    testID="profile-email"
                    style={{ marginTop: 2 }}
                  >
                    {data.email}
                  </Text>
                </View>
                <Pressable
                  onPress={() => router.push("/edit-profile")}
                  testID="profile-edit"
                  hitSlop={8}
                >
                  <Text variant="label" color={t.colors.work}>
                    Edit {"›"}
                  </Text>
                </Pressable>
              </View>
            </Card>

            {/* ── BA One Pro card ── */}
            <Card accent="work" style={{ borderWidth: 2, borderColor: t.colors.work }}>
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                  <Text variant="heading">{planName}</Text>
                  <Text variant="label" color={t.colors.textSecondary}>{planPrice}</Text>
                </View>
                <View style={{ gap: 2, marginTop: 4 }}>
                  <Text variant="caption" color={t.colors.textSecondary}>
                    {"✓"} Priority booking & support
                  </Text>
                  <Text variant="caption" color={t.colors.textSecondary}>
                    {"✓"} Full health record access
                  </Text>
                  <Text variant="caption" color={t.colors.textSecondary}>
                    {"✓"} Business tools & analytics
                  </Text>
                </View>
                <Pressable
                  onPress={() => router.push("/membership")}
                  testID="link-membership-manage"
                  hitSlop={8}
                  style={{ marginTop: 4 }}
                >
                  <Text variant="caption" color={t.colors.textMuted}>
                    Manage {"›"}
                  </Text>
                </Pressable>
              </View>
            </Card>
          </>
        )}

        {/* ── Account menu ── */}
        <Card>
          {MENU_ACCOUNT.map((item, i) => (
            <ListItem
              key={item.path}
              icon={<Avatar label={item.emoji} pillar={item.pillar} size={32} round />}
              title={item.label}
              right={<Text variant="caption" color={t.colors.textMuted}>{"›"}</Text>}
              onPress={() => router.push(item.path)}
              last={i === MENU_ACCOUNT.length - 1}
            />
          ))}
        </Card>

        {/* ── Settings menu ── */}
        <Card>
          {MENU_SETTINGS.map((item, i) => (
            <ListItem
              key={item.path}
              icon={
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9999,
                    backgroundColor: t.colors.surfaceMuted,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 15 }}>{item.emoji}</Text>
                </View>
              }
              title={item.label}
              right={<Text variant="caption" color={t.colors.textMuted}>{"›"}</Text>}
              onPress={() => router.push(item.path)}
              last={i === MENU_SETTINGS.length - 1}
            />
          ))}
        </Card>

        {/* ── Logout ── */}
        <Pressable
          onPress={onLogout}
          testID="logout"
          style={({ pressed }) => ({
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 14,
            borderRadius: t.radius.md,
            borderWidth: 1,
            borderColor: t.colors.border,
            backgroundColor: pressed ? t.colors.surfaceMuted : t.colors.surface,
          })}
        >
          <Text variant="label" color={t.colors.bad}>Log out</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
