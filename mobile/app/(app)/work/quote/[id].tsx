import { View } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Button, Spinner, Pill } from "@/components/ui";
import { fetchQuote, type Quote } from "@/api/work";
import { useTheme } from "@/theme/useTheme";

const STATUS_VARIANT: Record<
  Quote["status"],
  "muted" | "work" | "ok" | "bad" | "warn"
> = {
  draft: "muted",
  sent: "work",
  accepted: "ok",
  declined: "bad",
  expired: "warn",
};

function fmt(n: number): string {
  return n.toFixed(2);
}

export default function QuoteDetail() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["quote", id],
    queryFn: () => fetchQuote(id),
    enabled: !!id,
  });

  return (
    <Screen scroll testID="quote-detail-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: data?.quoteNumber ?? "Quote",
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />

      {isLoading ? (
        <Spinner center />
      ) : isError ? (
        <Card>
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <Ionicons
              name="alert-circle"
              size={20}
              color={t.colors.bad}
            />
            <Text color={t.colors.bad}>
              Could not load quote. Please try again.
            </Text>
          </View>
        </Card>
      ) : !data ? (
        <Card>
          <View
            style={{
              alignItems: "center",
              gap: 8,
              paddingVertical: 24,
            }}
          >
            <Ionicons
              name="document-outline"
              size={40}
              color={t.colors.textMuted}
            />
            <Text color={t.colors.textMuted}>Quote not found.</Text>
          </View>
        </Card>
      ) : (
        <View style={{ gap: 16 }}>
          {/* -- Status pill -- */}
          <View style={{ flexDirection: "row" }}>
            <Pill
              label={data.status.charAt(0).toUpperCase() + data.status.slice(1)}
              variant={STATUS_VARIANT[data.status]}
            />
          </View>

          {/* -- Client info -- */}
          <Card>
            <View style={{ gap: 10 }}>
              <Text
                variant="label"
                style={{ fontFamily: "Sora_700Bold" }}
              >
                Client
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Ionicons
                  name="person-outline"
                  size={16}
                  color={t.colors.textSecondary}
                />
                <Text variant="body">{data.clientName}</Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Ionicons
                  name="mail-outline"
                  size={16}
                  color={t.colors.textSecondary}
                />
                <Text variant="body" color={t.colors.textSecondary}>
                  {data.clientEmail}
                </Text>
              </View>

              {data.clientAddress ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={t.colors.textSecondary}
                  />
                  <Text variant="body" color={t.colors.textSecondary}>
                    {data.clientAddress}
                  </Text>
                </View>
              ) : null}
            </View>
          </Card>

          {/* -- Items -- */}
          <Card>
            <Text
              variant="label"
              style={{ fontFamily: "Sora_700Bold", marginBottom: 8 }}
            >
              Items
            </Text>

            {data.items.map((item, idx) => (
              <View key={idx}>
                {idx > 0 && (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: t.colors.border,
                      marginVertical: 12,
                    }}
                  />
                )}
                <View style={{ gap: 4 }}>
                  <Text variant="body" style={{ fontFamily: "Sora_600SemiBold" }}>
                    {item.description}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text variant="caption" color={t.colors.textSecondary}>
                      {item.quantity} x {"£"}{fmt(item.unitPrice)}
                    </Text>
                    <Text variant="body">
                      {"£"}{fmt(item.quantity * item.unitPrice)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </Card>

          {/* -- Totals -- */}
          <Card>
            <View style={{ gap: 10 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text variant="body" color={t.colors.textSecondary}>
                  Subtotal
                </Text>
                <Text variant="body">
                  {"£"}{fmt(data.subtotal)}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text variant="body" color={t.colors.textSecondary}>
                  VAT ({data.vatRate}%)
                </Text>
                <Text variant="body">
                  {"£"}{fmt(data.vatAmount)}
                </Text>
              </View>
              <View
                style={{
                  height: 1,
                  backgroundColor: t.colors.border,
                  marginVertical: 2,
                }}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  variant="subtitle"
                  style={{ fontFamily: "Sora_700Bold" }}
                >
                  Total
                </Text>
                <Text
                  variant="subtitle"
                  style={{ fontFamily: "Sora_700Bold" }}
                >
                  {"£"}{fmt(data.total)}
                </Text>
              </View>
            </View>
          </Card>

          {/* -- Date info -- */}
          <Card>
            <View style={{ gap: 8 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text variant="caption" color={t.colors.textMuted}>
                  Created
                </Text>
                <Text variant="caption" color={t.colors.textSecondary}>
                  {new Date(data.createdAt).toLocaleDateString("en-GB")}
                </Text>
              </View>
              {data.sentAt ? (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text variant="caption" color={t.colors.textMuted}>
                    Sent
                  </Text>
                  <Text variant="caption" color={t.colors.textSecondary}>
                    {new Date(data.sentAt).toLocaleDateString("en-GB")}
                  </Text>
                </View>
              ) : null}
              {data.validUntil ? (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text variant="caption" color={t.colors.textMuted}>
                    Valid until
                  </Text>
                  <Text variant="caption" color={t.colors.textSecondary}>
                    {new Date(data.validUntil).toLocaleDateString("en-GB")}
                  </Text>
                </View>
              ) : null}
            </View>
          </Card>

          {/* -- Actions -- */}
          <Button
            title="Preview PDF"
            variant="ghost"
            onPress={() =>
              router.push({
                pathname: "/(app)/work/quote-preview" as any,
                params: { id: data.id },
              })
            }
          />

          {data.status === "draft" && (
            <Button
              title="Send Quote"
              variant="work"
              onPress={() => {
                // TODO: implement send quote mutation
              }}
            />
          )}

          {data.status === "accepted" && (
            <Button
              title="Convert to Invoice"
              variant="primary"
              onPress={() =>
                router.push({
                  pathname: "/(app)/work/invoice-new" as any,
                  params: { quoteId: data.id },
                })
              }
            />
          )}
        </View>
      )}
    </Screen>
  );
}
