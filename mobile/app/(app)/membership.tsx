import { useState } from "react";
import { FlatList, View } from "react-native";
import { Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, Text, Card, Button, Spinner } from "@/components/ui";
import { fetchPlans, fetchSubscription } from "@/api/extras";

export default function Membership() {
  const plans = useQuery({ queryKey: ["plans"], queryFn: fetchPlans });
  const sub = useQuery({ queryKey: ["subscription"], queryFn: fetchSubscription });
  const [notice, setNotice] = useState<string | null>(null);

  // STUB: real checkout needs Stripe keys; surfaced as a notice for now.
  const subscribe = (planName: string) =>
    setNotice(`Pagamento de "${planName}" via Stripe estará disponível em breve no app.`);

  return (
    <Screen testID="membership-screen">
      <Stack.Screen options={{ headerShown: true, title: "Assinatura" }} />

      <Card style={{ marginBottom: 12 }}>
        <Text variant="label">Plano atual</Text>
        <Text muted testID="current-sub">
          {sub.data?.subscription ? sub.data.subscription.plan?.name ?? "Ativo" : "Sem assinatura ativa"}
        </Text>
      </Card>

      {notice ? (
        <Card style={{ marginBottom: 12 }}>
          <Text variant="caption" testID="sub-notice">{notice}</Text>
        </Card>
      ) : null}

      <Text variant="subtitle" style={{ marginBottom: 8 }}>Planos</Text>
      {plans.isLoading ? (
        <Spinner center />
      ) : (plans.data ?? []).length === 0 ? (
        <Text muted testID="plans-empty">Nenhum plano disponível.</Text>
      ) : (
        <FlatList
          data={plans.data}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <Card>
              <Text variant="subtitle">{item.name}</Text>
              {item.description ? <Text muted>{item.description}</Text> : null}
              <Text variant="label">
                {item.isFree ? "Grátis" : `£${item.price.toFixed(2)} / ${item.interval.toLowerCase()}`}
              </Text>
              {!item.isFree ? (
                <Button title="Assinar" onPress={() => subscribe(item.name)} testID={`sub-${item.id}`} />
              ) : null}
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
