import { View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Button, Spinner, Pill } from "@/components/ui";
import { fetchInvoice } from "@/api/work";
import { useTheme } from "@/theme/useTheme";

type PillVariant = "ok" | "warn" | "bad" | "work" | "muted";

const STATUS_CONFIG: Record<string, { variant: PillVariant; label: string }> = {
  draft: { variant: "muted", label: "Draft" },
  sent: { variant: "work", label: "Sent" },
  paid: { variant: "ok", label: "Paid" },
  overdue: { variant: "bad", label: "Overdue" },
  void: { variant: "muted", label: "Void" },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatCurrency(amount: number) {
  return `£${amount.toFixed(2)}`;
}

export default function InvoiceDetail() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => fetchInvoice(id),
    enabled: !!id,
  });

  const status = data ? STATUS_CONFIG[data.status] ?? STATUS_CONFIG.draft : null;

  return (
    <Screen scroll testID="invoice-detail">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Invoice",
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />

      {isLoading ? (
        <Spinner center />
      ) : isError || !data ? (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="alert-circle" size={20} color={t.colors.bad} />
            <Text color={t.colors.bad}>Failed to load invoice.</Text>
          </View>
        </Card>
      ) : (
        <View style={{ gap: 16 }}>
          {/* Invoice number + status */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text variant="subtitle" style={{ fontWeight: "700" }}>
              {data.invoiceNumber}
            </Text>
            {status && <Pill label={status.label} variant={status.variant} />}
          </View>

          {/* Dates card */}
          <Card>
            <View style={{ gap: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: t.colors.workSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Ionicons name="calendar-outline" size={20} color={t.colors.work} />
                </View>
                <View>
                  <Text variant="caption" color={t.colors.textMuted}>Created</Text>
                  <Text variant="label" style={{ fontWeight: "600" }}>{formatDate(data.createdAt)}</Text>
                </View>
              </View>

              {data.dueDate ? (
                <>
                  <View style={{ height: 1, backgroundColor: t.colors.border }} />
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: t.colors.warnSoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <Ionicons name="hourglass-outline" size={20} color={t.colors.warn} />
                    </View>
                    <View>
                      <Text variant="caption" color={t.colors.textMuted}>Due Date</Text>
                      <Text variant="label" style={{ fontWeight: "600" }}>{formatDate(data.dueDate)}</Text>
                    </View>
                  </View>
                </>
              ) : null}

              {data.paidAt ? (
                <>
                  <View style={{ height: 1, backgroundColor: t.colors.border }} />
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: t.colors.okSoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <Ionicons name="checkmark-circle-outline" size={20} color={t.colors.ok} />
                    </View>
                    <View>
                      <Text variant="caption" color={t.colors.textMuted}>Paid</Text>
                      <Text variant="label" style={{ fontWeight: "600" }}>{formatDate(data.paidAt)}</Text>
                    </View>
                  </View>
                </>
              ) : null}
            </View>
          </Card>

          {/* Client info card */}
          <Card>
            <View style={{ gap: 12 }}>
              <Text variant="label" style={{ fontWeight: "600" }}>Client</Text>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="person-outline" size={18} color={t.colors.textSecondary} />
                <Text variant="body">{data.clientName}</Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="mail-outline" size={18} color={t.colors.textSecondary} />
                <Text variant="body" color={t.colors.textSecondary}>{data.clientEmail}</Text>
              </View>

              {data.clientAddress ? (
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                  <Ionicons name="location-outline" size={18} color={t.colors.textSecondary} style={{ marginTop: 2 }} />
                  <Text variant="body" color={t.colors.textSecondary} style={{ flex: 1 }}>
                    {data.clientAddress}
                  </Text>
                </View>
              ) : null}
            </View>
          </Card>

          {/* Items card */}
          <Card>
            <View style={{ gap: 12 }}>
              <Text variant="label" style={{ fontWeight: "600" }}>Items</Text>

              {data.items.map((item, index) => (
                <View key={index}>
                  {index > 0 && (
                    <View style={{ height: 1, backgroundColor: t.colors.border, marginBottom: 12 }} />
                  )}
                  <View style={{ gap: 4 }}>
                    <Text variant="body">{item.description}</Text>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text variant="caption" color={t.colors.textMuted}>
                        {item.quantity} x {formatCurrency(item.unitPrice)}
                      </Text>
                      <Text variant="body" style={{ fontWeight: "600" }}>
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </Card>

          {/* Totals card */}
          <Card>
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="body" color={t.colors.textSecondary}>Subtotal</Text>
                <Text variant="body">{formatCurrency(data.subtotal)}</Text>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="body" color={t.colors.textSecondary}>VAT ({data.vatRate}%)</Text>
                <Text variant="body">{formatCurrency(data.vatAmount)}</Text>
              </View>

              <View style={{ height: 1, backgroundColor: t.colors.border }} />

              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="subtitle" style={{ fontWeight: "700" }}>Total</Text>
                <Text variant="subtitle" style={{ fontWeight: "700" }}>
                  {formatCurrency(data.total)}
                </Text>
              </View>
            </View>
          </Card>

          {/* Payment status */}
          {data.status === "paid" && data.paidAt ? (
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: t.colors.okSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Ionicons name="checkmark-circle" size={24} color={t.colors.ok} />
                </View>
                <View>
                  <Text variant="label" style={{ fontWeight: "600" }} color={t.colors.ok}>
                    Payment Received
                  </Text>
                  <Text variant="caption" color={t.colors.textMuted}>
                    {formatDate(data.paidAt)}
                  </Text>
                </View>
              </View>
            </Card>
          ) : null}

          {data.status === "overdue" ? (
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: t.colors.warnSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Ionicons name="warning" size={24} color={t.colors.warn} />
                </View>
                <View>
                  <Text variant="label" style={{ fontWeight: "600" }} color={t.colors.warn}>
                    Payment Overdue
                  </Text>
                  {data.dueDate ? (
                    <Text variant="caption" color={t.colors.textMuted}>
                      Due {formatDate(data.dueDate)}
                    </Text>
                  ) : null}
                </View>
              </View>
            </Card>
          ) : null}

          {/* Send action for drafts */}
          {data.status === "draft" ? (
            <Button
              title="Send Invoice"
              variant="work"
              icon={<Ionicons name="send-outline" size={18} color="#FFFFFF" />}
              onPress={() => {}}
            />
          ) : null}
        </View>
      )}
    </Screen>
  );
}
