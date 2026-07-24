import { useMemo } from "react";
import { View, Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  Screen,
  Text,
  Card,
  Pill,
  Avatar,
  ListItem,
  Spinner,
} from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import {
  fetchCompliance,
  fetchBusinessProfile,
  type ComplianceItem,
} from "@/api/work";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function deadlinePillVariant(
  days: number,
): "warn" | "work" | "ok" | "bad" {
  if (days < 0) return "bad";
  if (days < 14) return "warn";
  if (days < 30) return "work";
  return "ok";
}

function deadlinePillLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Today";
  return `${days}d left`;
}

function companyInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function fmtFee(fee?: string): string {
  if (!fee) return "";
  return ` · ${fee}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Compliance() {
  const t = useTheme();

  const profileQ = useQuery({
    queryKey: ["businessProfile"],
    queryFn: fetchBusinessProfile,
  });

  const complianceQ = useQuery({
    queryKey: ["compliance"],
    queryFn: fetchCompliance,
  });

  const isLoading = profileQ.isLoading || complianceQ.isLoading;
  const isError = profileQ.isError || complianceQ.isError;

  const profile = profileQ.data;
  const items = complianceQ.data?.items ?? [];

  const sortedDeadlines = useMemo(() => {
    return items
      .filter((c) => c.expiresAt)
      .sort(
        (a, b) =>
          new Date(a.expiresAt!).getTime() - new Date(b.expiresAt!).getTime(),
      );
  }, [items]);

  return (
    <Screen scroll testID="compliance-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Compliance",
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: t.colors.surfaceMuted,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 4,
              }}
            >
              <Ionicons name="add" size={20} color={t.colors.text} />
            </Pressable>
          ),
        }}
      />

      {isLoading ? (
        <Spinner center />
      ) : isError ? (
        <Card>
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <Ionicons name="alert-circle" size={20} color={t.colors.bad} />
            <Text color={t.colors.bad}>
              Could not load compliance data. Please try again.
            </Text>
          </View>
        </Card>
      ) : (
        <View style={{ gap: 20 }}>
          {/* Company card */}
          {profile && (
            <Card accent="work">
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Avatar
                  label={companyInitials(
                    profile.tradingName || profile.legalName,
                  )}
                  pillar="work"
                  size={44}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    variant="label"
                    style={{ fontFamily: "Sora_700Bold" }}
                  >
                    {profile.tradingName || profile.legalName}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 2,
                    }}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color={t.colors.ok}
                    />
                    <Text
                      variant="caption"
                      color={t.colors.textMuted}
                    >
                      Synced with Companies House
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          )}

          {/* Next deadlines */}
          <Text
            variant="eyebrow"
            color={t.colors.textMuted}
            style={{ textTransform: "uppercase" }}
          >
            Next deadlines
          </Text>

          {sortedDeadlines.length === 0 ? (
            <Card>
              <View
                style={{
                  alignItems: "center",
                  gap: 8,
                  paddingVertical: 24,
                }}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={36}
                  color={t.colors.textMuted}
                />
                <Text color={t.colors.textMuted}>
                  No upcoming deadlines
                </Text>
              </View>
            </Card>
          ) : (
            <Card>
              {sortedDeadlines.map((item, i) => {
                const days = daysUntil(item.expiresAt!);
                return (
                  <ListItem
                    key={item.id}
                    icon={
                      <Avatar label={"📄"} pillar="work" size={36} />
                    }
                    title={item.name}
                    subtitle={`${item.category}${fmtFee(item.documentUrl)}`}
                    last={i === sortedDeadlines.length - 1}
                    right={
                      <Pill
                        label={deadlinePillLabel(days)}
                        variant={deadlinePillVariant(days)}
                      />
                    }
                  />
                );
              })}
            </Card>
          )}

          {/* Learn card */}
          <Card>
            <Pressable
              onPress={() =>
                router.push("/education" as any)
              }
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 11,
                  backgroundColor: t.colors.communitySoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="school-outline"
                  size={20}
                  color={t.colors.community}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="label">Not sure what a CS01 is?</Text>
                <Text
                  variant="caption"
                  color={t.colors.textMuted}
                  style={{ marginTop: 1 }}
                >
                  Learn about your compliance obligations
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={t.colors.textMuted}
              />
            </Pressable>
          </Card>
        </View>
      )}
    </Screen>
  );
}
