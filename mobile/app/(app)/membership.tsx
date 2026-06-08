import { useState } from "react";
import { FlatList, Linking, View } from "react-native";
import { Stack } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen, Text, Card, Button, Spinner } from "@/components/ui";
import { fetchPlans, fetchSubscription, subscribeToPlan } from "@/api/extras";

export default function Membership() {
  const qc = useQueryClient();
  const plans = useQuery({ queryKey: ["plans"], queryFn: fetchPlans });
  const sub = useQuery({ queryKey: ["subscription"], queryFn: fetchSubscription });
  const [notice, setNotice] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (planId: string) => subscribeToPlan(planId),
    onSuccess: async (res) => {
      if (res.checkoutUrl) {
        // Paid plan with Stripe configured → open hosted checkout.
        setNotice("Abrindo o pagamento seguro…");
        Linking.openURL(res.checkoutUrl).catch(() => setNotice("Não foi possível abrir o checkout."));
      } else {
        setNotice(res.message || "Assinatura ativada.");
        qc.invalidateQueries({ queryKey: ["subscription"] });
      }
    },
    onError: (e) => setNotice((e as Error).message || "Falha ao assinar."),
  });

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
              <Button
                title={item.isFree ? "Ativar" : "Assinar"}
                onPress={() => mutation.mutate(item.id)}
                loading={mutation.isPending && mutation.variables === item.id}
                testID={`sub-${item.id}`}
              />
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
