import { View, Pressable } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  Screen,
  Text,
  Card,
  Button,
  Spinner,
} from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { fetchQuote, fetchBusinessProfile } from "@/api/work";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtGBP(n: number): string {
  return (
    "£" +
    n.toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QuotePreview() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const quoteQ = useQuery({
    queryKey: ["quote", id],
    queryFn: () => fetchQuote(id),
    enabled: !!id,
  });

  const profileQ = useQuery({
    queryKey: ["businessProfile"],
    queryFn: fetchBusinessProfile,
  });

  const isLoading = quoteQ.isLoading || profileQ.isLoading;
  const isError = quoteQ.isError;
  const quote = quoteQ.data;
  const profile = profileQ.data;

  return (
    <Screen scroll testID="quote-preview-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Preview",
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable
              onPress={() =>
                router.push(`/work/quote/${id}` as any)
              }
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
              <Ionicons
                name="create-outline"
                size={18}
                color={t.colors.text}
              />
            </Pressable>
          ),
        }}
      />

      {isLoading ? (
        <Spinner center />
      ) : isError || !quote ? (
        <Card>
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <Ionicons name="alert-circle" size={20} color={t.colors.bad} />
            <Text color={t.colors.bad}>
              Could not load quote. Please try again.
            </Text>
          </View>
        </Card>
      ) : (
        <View style={{ gap: 20 }}>
          {/* Document card (paper preview) */}
          <Card
            style={{
              padding: 24,
              borderWidth: 1,
              borderColor: t.colors.border,
            }}
          >
            {/* Company header */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Sora_800ExtraBold",
                  textTransform: "uppercase",
                  color: t.colors.text,
                  letterSpacing: 1,
                }}
              >
                {profile?.tradingName ?? profile?.legalName ?? ""}
              </Text>
              {profile?.address && (
                <Text
                  variant="caption"
                  color={t.colors.textMuted}
                  style={{ marginTop: 4 }}
                >
                  {profile.address}
                </Text>
              )}
              {profile?.phone && (
                <Text variant="caption" color={t.colors.textMuted}>
                  {profile.phone}
                </Text>
              )}
              {profile?.email && (
                <Text variant="caption" color={t.colors.textMuted}>
                  {profile.email}
                </Text>
              )}
            </View>

            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: t.colors.border,
                marginBottom: 20,
              }}
            />

            {/* Quote label + number + date */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 20,
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 20,
                    fontFamily: "Sora_800ExtraBold",
                    color: t.colors.text,
                  }}
                >
                  QUOTE
                </Text>
                <Text
                  variant="caption"
                  color={t.colors.textMuted}
                  style={{ marginTop: 2 }}
                >
                  #{quote.quoteNumber}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text variant="caption" color={t.colors.textMuted}>
                  {fmtDate(quote.createdAt)}
                </Text>
              </View>
            </View>

            {/* Client */}
            <View style={{ marginBottom: 24 }}>
              <Text
                variant="eyebrow"
                color={t.colors.textMuted}
                style={{ textTransform: "uppercase", marginBottom: 4 }}
              >
                For:
              </Text>
              <Text variant="label" style={{ fontFamily: "Inter_600SemiBold" }}>
                {quote.clientName}
              </Text>
              {quote.clientAddress && (
                <Text
                  variant="caption"
                  color={t.colors.textSecondary}
                  style={{ marginTop: 2 }}
                >
                  {quote.clientAddress}
                </Text>
              )}
            </View>

            {/* Line items table */}
            <View style={{ marginBottom: 16 }}>
              {quote.items.map((item, idx) => (
                <View
                  key={idx}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: t.colors.borderSubtle,
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text
                      variant="body"
                      style={{ fontFamily: "Inter_400Regular" }}
                    >
                      {item.description}
                    </Text>
                    {item.quantity > 1 && (
                      <Text
                        variant="caption"
                        color={t.colors.textMuted}
                        style={{ marginTop: 1 }}
                      >
                        {item.quantity} x {fmtGBP(item.unitPrice)}
                      </Text>
                    )}
                  </View>
                  <Text
                    variant="body"
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    {fmtGBP(item.quantity * item.unitPrice)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Subtotal / VAT */}
            <View style={{ gap: 6, marginBottom: 8 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text variant="caption" color={t.colors.textSecondary}>
                  Subtotal
                </Text>
                <Text variant="caption" color={t.colors.textSecondary}>
                  {fmtGBP(quote.subtotal)}
                </Text>
              </View>
              {quote.vatRate > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text variant="caption" color={t.colors.textSecondary}>
                    VAT ({quote.vatRate}%)
                  </Text>
                  <Text variant="caption" color={t.colors.textSecondary}>
                    {fmtGBP(quote.vatAmount)}
                  </Text>
                </View>
              )}
            </View>

            {/* Total */}
            <View
              style={{
                borderTopWidth: 2,
                borderTopColor: t.colors.text,
                paddingTop: 10,
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Sora_700Bold",
                  color: t.colors.text,
                }}
              >
                Total
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Sora_700Bold",
                  color: t.colors.text,
                }}
              >
                {fmtGBP(quote.total)}
              </Text>
            </View>

            {/* Footer */}
            <View style={{ marginTop: 24, gap: 4 }}>
              {quote.validUntil && (
                <Text variant="caption" color={t.colors.textMuted}>
                  Valid until {fmtDate(quote.validUntil)}
                </Text>
              )}
              <Text variant="caption" color={t.colors.textMuted}>
                Payment due on completion unless otherwise agreed.
              </Text>
              <Text variant="caption" color={t.colors.textMuted}>
                All work guaranteed for 12 months.
              </Text>
            </View>
          </Card>

          {/* Action buttons */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Button
              title="Share link"
              variant="ghost"
              style={{ flex: 1 }}
              icon={
                <Ionicons
                  name="link-outline"
                  size={16}
                  color={t.colors.text}
                />
              }
              onPress={() => {
                // TODO: implement share link
              }}
            />
            <Button
              title={`Send to ${quote.clientName.split(" ")[0]}`}
              variant="primary"
              style={{ flex: 1 }}
              onPress={() => {
                // TODO: implement send quote
              }}
            />
          </View>

          {/* Note */}
          <Text
            variant="caption"
            color={t.colors.textMuted}
            style={{ textAlign: "center" }}
          >
            Nothing is sent without your approval.
          </Text>
        </View>
      )}
    </Screen>
  );
}
