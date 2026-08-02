import { useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  Screen,
  Text,
  Card,
  Pill,
  Avatar,
  ListItem,
  SegmentedControl,
  Spinner,
} from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import {
  fetchQuotes,
  fetchInvoices,
  fetchCompliance,
  type Quote,
  type Invoice,
} from "@/api/work";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEGMENTS = ["Quotes", "Invoices", "Receipts"];

function fmtGBP(n: number): string {
  return (
    "£" +
    n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

function relativeDate(iso: string): string {
  const now = Date.now();
  const d = new Date(iso).getTime();
  const diffMs = now - d;
  const days = Math.floor(diffMs / 86_400_000);
  if (days < 0) return `in ${Math.abs(days)}d`;
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  if (days < 14) return "1w ago";
  return `${Math.floor(days / 7)}w ago`;
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function quotePillVariant(
  status: Quote["status"],
): "work" | "warn" | "ok" | "bad" | "muted" {
  switch (status) {
    case "draft":
      return "work";
    case "sent":
      return "warn";
    case "accepted":
      return "ok";
    case "expired":
    case "declined":
      return "bad";
    default:
      return "muted";
  }
}

function invoicePillVariant(
  status: Invoice["status"],
): "work" | "warn" | "ok" | "bad" | "muted" {
  switch (status) {
    case "draft":
      return "work";
    case "sent":
      return "warn";
    case "paid":
      return "ok";
    case "overdue":
    case "void":
      return "bad";
    default:
      return "muted";
  }
}

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Work() {
  const t = useTheme();
  const [segment, setSegment] = useState(0);

  const quotesQ = useQuery({ queryKey: ["quotes"], queryFn: fetchQuotes });
  const invoicesQ = useQuery({ queryKey: ["invoices"], queryFn: fetchInvoices });
  const complianceQ = useQuery({
    queryKey: ["compliance"],
    queryFn: fetchCompliance,
  });

  const isLoading = quotesQ.isLoading || invoicesQ.isLoading;

  const quotes = quotesQ.data ?? [];
  const invoices = invoicesQ.data ?? [];

  // Stats computed from real data
  const stats = useMemo(() => {
    const invoicedTotal = invoices
      .filter((inv) => inv.status === "paid")
      .reduce((sum, inv) => sum + inv.total, 0);

    const awaitingTotal = invoices
      .filter((inv) => inv.status === "sent" || inv.status === "overdue")
      .reduce((sum, inv) => sum + inv.total, 0);

    const quotesOut = quotes.filter(
      (q) => q.status === "sent" || q.status === "draft",
    ).length;

    return { invoicedTotal, awaitingTotal, quotesOut };
  }, [quotes, invoices]);

  // Nearest compliance deadline
  const nearestDeadline = useMemo(() => {
    const items = complianceQ.data?.items ?? [];
    const upcoming = items
      .filter((c) => c.expiresAt)
      .sort(
        (a, b) =>
          new Date(a.expiresAt!).getTime() - new Date(b.expiresAt!).getTime(),
      );
    return upcoming[0] ?? null;
  }, [complianceQ.data]);

  return (
    <Screen scroll testID="work-screen">
      <View style={{ gap: 20, paddingBottom: 80 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text variant="title">Work</Text>
          <Pressable
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: t.colors.surfaceMuted,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="search-outline" size={20} color={t.colors.text} />
          </Pressable>
        </View>

        {/* Stats card */}
        <View
          style={{
            backgroundColor: t.colors.work,
            borderRadius: t.radius.md,
            padding: 20,
            gap: 16,
          }}
        >
          <Text
            variant="eyebrow"
            color="rgba(255,255,255,0.6)"
            style={{ textTransform: "uppercase" }}
          >
            {new Date().toLocaleString("en-GB", { month: "long" }).toUpperCase()}
          </Text>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <View style={{ gap: 2 }}>
              <Text
                style={{
                  fontSize: 22,
                  fontFamily: "Sora_800ExtraBold",
                  color: "#FFFFFF",
                }}
              >
                {fmtGBP(stats.invoicedTotal)}
              </Text>
              <Text variant="caption" color="rgba(255,255,255,0.6)">
                invoiced
              </Text>
            </View>
            <View style={{ gap: 2 }}>
              <Text
                style={{
                  fontSize: 22,
                  fontFamily: "Sora_800ExtraBold",
                  color: "#FFFFFF",
                }}
              >
                {fmtGBP(stats.awaitingTotal)}
              </Text>
              <Text variant="caption" color="rgba(255,255,255,0.6)">
                awaiting
              </Text>
            </View>
            <View style={{ gap: 2 }}>
              <Text
                style={{
                  fontSize: 22,
                  fontFamily: "Sora_800ExtraBold",
                  color: "#FFFFFF",
                }}
              >
                {String(stats.quotesOut)}
              </Text>
              <Text variant="caption" color="rgba(255,255,255,0.6)">
                quotes out
              </Text>
            </View>
          </View>
        </View>

        {/* Compliance alert */}
        {nearestDeadline && nearestDeadline.expiresAt && (
          <Card accent="work">
            <Pressable
              onPress={() => router.push("/work/compliance" as any)}
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
                  backgroundColor: t.colors.workSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={20}
                  color={t.colors.work}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="label">
                  {nearestDeadline.name} due in{" "}
                  {daysUntil(nearestDeadline.expiresAt)} days
                </Text>
                <Text
                  variant="caption"
                  color={t.colors.textMuted}
                  style={{ marginTop: 1 }}
                >
                  {nearestDeadline.category}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={t.colors.textMuted}
              />
            </Pressable>
          </Card>
        )}

        {/* Segmented control */}
        <SegmentedControl
          options={SEGMENTS}
          selected={segment}
          onSelect={setSegment}
        />

        {/* Items list */}
        {isLoading ? (
          <Spinner center />
        ) : (
          <Card>
            {segment === 0 &&
              (quotes.length === 0 ? (
                <View
                  style={{
                    alignItems: "center",
                    gap: 8,
                    paddingVertical: 24,
                  }}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={36}
                    color={t.colors.textMuted}
                  />
                  <Text color={t.colors.textMuted}>No quotes yet</Text>
                </View>
              ) : (
                quotes.map((q, i) => (
                  <ListItem
                    key={q.id}
                    onPress={() => router.push(`/work/quote/${q.id}` as any)}
                    icon={<Avatar label="Q" pillar="work" size={36} />}
                    title={`#${q.quoteNumber}`}
                    subtitle={`${q.clientName} · ${relativeDate(q.createdAt)}`}
                    last={i === quotes.length - 1}
                    right={
                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <Text
                          variant="label"
                          style={{
                            fontSize: 13,
                            fontFamily: "Sora_700Bold",
                          }}
                        >
                          {fmtGBP(q.total)}
                        </Text>
                        <Pill
                          label={statusLabel(q.status)}
                          variant={quotePillVariant(q.status)}
                        />
                      </View>
                    }
                  />
                ))
              ))}

            {segment === 1 &&
              (invoices.length === 0 ? (
                <View
                  style={{
                    alignItems: "center",
                    gap: 8,
                    paddingVertical: 24,
                  }}
                >
                  <Ionicons
                    name="receipt-outline"
                    size={36}
                    color={t.colors.textMuted}
                  />
                  <Text color={t.colors.textMuted}>No invoices yet</Text>
                </View>
              ) : (
                invoices.map((inv, i) => (
                  <ListItem
                    key={inv.id}
                    onPress={() =>
                      router.push(`/work/invoice/${inv.id}` as any)
                    }
                    icon={<Avatar label="I" pillar="work" size={36} />}
                    title={`#${inv.invoiceNumber}`}
                    subtitle={`${inv.clientName} · ${relativeDate(inv.createdAt)}`}
                    last={i === invoices.length - 1}
                    right={
                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <Text
                          variant="label"
                          style={{
                            fontSize: 13,
                            fontFamily: "Sora_700Bold",
                          }}
                        >
                          {fmtGBP(inv.total)}
                        </Text>
                        <Pill
                          label={statusLabel(inv.status)}
                          variant={invoicePillVariant(inv.status)}
                        />
                      </View>
                    }
                  />
                ))
              ))}

            {segment === 2 && (
              <View
                style={{
                  alignItems: "center",
                  gap: 8,
                  paddingVertical: 24,
                }}
              >
                <Ionicons
                  name="camera-outline"
                  size={36}
                  color={t.colors.textMuted}
                />
                <Text color={t.colors.textMuted}>
                  Snap a receipt to log expenses
                </Text>
              </View>
            )}
          </Card>
        )}
      </View>

      {/* FAB */}
      <Pressable
        onPress={() => router.push("/work/quote-new" as any)}
        style={({ pressed }) => ({
          position: "absolute",
          bottom: 72,
          right: 16,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: t.colors.primary,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.95 : 1 }],
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 6,
        })}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>
    </Screen>
  );
}
