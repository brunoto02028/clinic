import { View, Linking, Alert } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, Text, Card, Button, Spinner } from "@/components/ui";
import { fetchLabOrder } from "@/api/labs";
import { useTheme } from "@/theme/useTheme";

const SAGE_DARK = "#4F6864";
const WARN = "#B8823A";
const WARN_BG = "#F5EFDD";

// NOTE: there is no structured biomarker-result endpoint yet (LabTestRegistration
// / LabResult models are still pending — see Task 17). This screen renders from
// the LabOrder itself: items ordered, and the LML report link once available
// (resultsUrl/resultsPdf), plus any clinician note left on the RESULTS_READY
// event. Once the result models land, swap this for a dedicated
// fetchLabResult(id) call with the per-biomarker breakdown.
export default function LabResult() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["lab-order", id],
    queryFn: () => fetchLabOrder(id),
    enabled: !!id,
  });

  if (isLoading) return <Screen><Spinner center /></Screen>;
  if (isError || !data) return <Screen><Text>Result not found.</Text></Screen>;

  const reportUrl = data.resultsUrl || data.resultsPdf || null;
  const readyEvent = data.events?.find((e) => e.status === "RESULTS_READY" && e.note);
  const testName = data.items?.[0]?.productName || "Lab Test";

  const openReport = async () => {
    if (!reportUrl) return;
    try {
      await Linking.openURL(reportUrl);
    } catch {
      Alert.alert("Error", "Could not open the report.");
    }
  };

  return (
    <Screen scroll testID="lab-result-screen">
      <Stack.Screen options={{
        headerShown: true, title: "Result",
        headerStyle: { backgroundColor: t.colors.background },
        headerTintColor: t.colors.text, headerShadowVisible: false,
      }} />
      <View style={{ gap: 14 }}>
        <Card>
          <Text variant="subtitle" style={{ fontFamily: "Sora_700Bold", fontSize: 14 }}>
            {testName}
          </Text>
          <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 4 }}>
            Order #{data.orderNumber}
          </Text>
        </Card>

        <Card>
          <Text variant="label" style={{ fontFamily: "Sora_600SemiBold", marginBottom: 10 }}>
            Tests in this order
          </Text>
          {data.items.map((item, idx) => (
            <View key={item.id} style={{
              flexDirection: "row", justifyContent: "space-between", alignItems: "center",
              paddingVertical: 9,
              borderBottomWidth: idx < data.items.length - 1 ? 1 : 0,
              borderBottomColor: t.colors.border,
            }}>
              <Text variant="body" style={{ fontFamily: "Sora_600SemiBold", fontSize: 12 }}>{item.productName}</Text>
              <Text style={{ fontFamily: "Sora_700Bold", fontSize: 13, color: SAGE_DARK }}>
                £{item.total.toFixed(2)}
              </Text>
            </View>
          ))}
        </Card>

        {readyEvent?.note ? (
          <Card style={{ backgroundColor: WARN_BG }}>
            <Text variant="label" style={{ fontFamily: "Sora_600SemiBold", color: WARN, marginBottom: 6 }}>
              Clinical comment
            </Text>
            <Text variant="body" style={{ fontSize: 12, lineHeight: 18 }}>{readyEvent.note}</Text>
          </Card>
        ) : null}

        {reportUrl ? (
          <Button title="View full report" variant="primary" size="lg"
            onPress={openReport}
            style={{ backgroundColor: "#65807B" }} />
        ) : (
          <Card>
            <Text variant="body" color={t.colors.textMuted} style={{ fontSize: 12, textAlign: "center" }}>
              Your report is being prepared and will appear here once ready.
            </Text>
          </Card>
        )}

        <Button title="Discuss with physiotherapist" variant="ghost" size="md" />
      </View>
    </Screen>
  );
}
