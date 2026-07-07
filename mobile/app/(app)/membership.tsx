import { useEffect, useState } from "react";
import { Alert, FlatList, Linking, View } from "react-native";
import { Stack } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Button, Spinner } from "@/components/ui";
import { fetchPlans, fetchSubscription, subscribeToPlan, cancelSubscription } from "@/api/extras";
import { useTheme } from "@/theme/useTheme";

const MODULES = [
  "Dashboard", "Meu Perfil", "Planos & Assinatura", "Avaliação",
  "Consultas", "Registros", "Exercícios", "Scans 3D",
  "Documentos", "Tratamento", "Body Assessment",
];

export default function Membership() {
  const t = useTheme();
  const qc = useQueryClient();
  const plans = useQuery({ queryKey: ["plans"], queryFn: fetchPlans });
  const sub = useQuery({ queryKey: ["subscription"], queryFn: fetchSubscription });
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const handler = ({ url }: { url: string }) => {
      if (url.includes("membership")) {
        const status = new URL(url).searchParams.get("status");
        if (status === "success") {
          setNotice("Assinatura ativada com sucesso!");
        } else if (status === "cancelled") {
          setNotice("Pagamento cancelado.");
        }
        qc.invalidateQueries({ queryKey: ["subscription"] });
      }
    };
    const subscription = Linking.addEventListener("url", handler);
    return () => subscription.remove();
  }, [qc]);

  const subscribeMutation = useMutation({
    mutationFn: (planId: string) => subscribeToPlan(planId),
    onSuccess: async (res) => {
      if (res.checkoutUrl) {
        setNotice("Abrindo pagamento seguro…");
        Linking.openURL(res.checkoutUrl).catch(() => setNotice("Não foi possível abrir."));
      } else {
        setNotice(res.message || "Assinatura ativada.");
        qc.invalidateQueries({ queryKey: ["subscription"] });
      }
    },
    onError: (e) => setNotice((e as Error).message || "Falha ao assinar."),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: (res) => {
      setNotice(res.message || "Assinatura cancelada.");
      qc.invalidateQueries({ queryKey: ["subscription"] });
    },
    onError: (e) => setNotice((e as Error).message || "Falha ao cancelar."),
  });

  const handleCancel = () => {
    Alert.alert(
      "Cancelar plano",
      "Tem certeza? Se for plano Stripe, o acesso continua até o fim do período pago.",
      [
        { text: "Não", style: "cancel" },
        { text: "Sim, cancelar", style: "destructive", onPress: () => cancelMutation.mutate() },
      ],
    );
  };

  const currentSub = sub.data?.subscription;
  const currentPlan = currentSub?.plan;

  return (
    <Screen scroll testID="membership-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Assinatura",
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={{ gap: 20 }}>
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="diamond-outline" size={22} color={t.colors.secondary} />
            <Text variant="title">Assinatura & Planos</Text>
          </View>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 4 }}>
            Gerencie seu acesso a ferramentas de saúde e exercícios.
          </Text>
        </View>

        {/* Current plan */}
        <Card variant="highlight">
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#5dc9c0" />
              <Text variant="label" style={{ fontWeight: "600" }}>Seu plano atual</Text>
            </View>
            <View style={{
              backgroundColor: currentSub?.cancelAtPeriodEnd ? "rgba(251, 191, 36, 0.15)" : "rgba(16, 185, 129, 0.15)",
              paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
            }}>
              <Text variant="caption" color={currentSub?.cancelAtPeriodEnd ? "#fbbf24" : "#34d399"} style={{ fontWeight: "700", fontSize: 11 }}>
                {currentSub?.cancelAtPeriodEnd ? "Cancela em breve" : "Ativo"}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
            <Text variant="subtitle" style={{ fontSize: 22 }}>{currentPlan?.name ?? "Plano Free"}</Text>
            <Text variant="caption" color="#34d399" style={{ fontWeight: "600" }}>
              {currentPlan?.isFree !== false ? "Free" : `£${currentPlan.price?.toFixed(2)}/mês`}
            </Text>
          </View>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 4, marginBottom: 12 }}>
            Acesso completo gratuito a todos os módulos do portal.
          </Text>

          <Text variant="caption" color={t.colors.textMuted} style={{ fontWeight: "600", marginBottom: 8 }}>
            MÓDULOS INCLUÍDOS
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {MODULES.map((m) => (
              <View key={m} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="checkmark-circle" size={14} color="#34d399" />
                <Text variant="caption" color={t.colors.textSecondary} style={{ fontSize: 12 }}>{m}</Text>
              </View>
            ))}
          </View>

          {currentSub && !currentSub.cancelAtPeriodEnd && (
            <Button
              title="Cancelar plano"
              variant="secondary"
              size="sm"
              onPress={handleCancel}
              loading={cancelMutation.isPending}
              testID="cancel-sub"
            />
          )}
        </Card>

        {notice && (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="information-circle-outline" size={18} color={t.colors.secondary} />
              <Text variant="caption" color={t.colors.textSecondary} testID="sub-notice">{notice}</Text>
            </View>
          </Card>
        )}

        {/* Available plans */}
        <Text variant="subtitle">Upgrade</Text>
        {plans.isLoading ? (
          <Spinner center />
        ) : (plans.data ?? []).length === 0 ? (
          <Card>
            <Text muted testID="plans-empty">Nenhum plano adicional disponível.</Text>
          </Card>
        ) : (
          <View style={{ gap: 12 }}>
            {(plans.data ?? []).map((item) => (
              <Card key={item.id}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text variant="subtitle">{item.name}</Text>
                  {currentPlan?.id === item.id && (
                    <View style={{
                      backgroundColor: "rgba(139, 92, 246, 0.15)",
                      paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
                    }}>
                      <Text variant="caption" color="#a78bfa" style={{ fontWeight: "700", fontSize: 10 }}>ATUAL</Text>
                    </View>
                  )}
                </View>
                {item.description && (
                  <Text variant="caption" color={t.colors.textSecondary}>{item.description}</Text>
                )}
                <Text variant="label" color={t.colors.secondary} style={{ fontWeight: "700" }}>
                  {item.isFree ? "Grátis" : `£${item.price.toFixed(2)} / ${item.interval.toLowerCase()}`}
                </Text>
                {currentPlan?.id !== item.id && (
                  <Button
                    title={item.isFree ? "Ativar" : "Assinar"}
                    variant="secondary"
                    onPress={() => subscribeMutation.mutate(item.id)}
                    loading={subscribeMutation.isPending && subscribeMutation.variables === item.id}
                    testID={`sub-${item.id}`}
                    size="sm"
                  />
                )}
              </Card>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
