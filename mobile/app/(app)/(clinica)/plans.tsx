import { useEffect, useState } from "react";
import { Alert, Linking, View } from "react-native";
import { Stack } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Button, Spinner } from "@/components/ui";
import { fetchPlans, fetchSubscription, subscribeToPlan, cancelSubscription } from "@/api/extras";
import { useTheme } from "@/theme/useTheme";
import { openCheckout } from "@/lib/checkout";
import { useLang, t as tr } from "@/lib/i18n";

/**
 * Os planos da clínica, na área do paciente da clínica (082, T-3).
 *
 * O servidor já filtrava certo: `/api/patient/membership/plans` devolve os
 * planos oferecidos a **todos** mais os oferecidos a **este** paciente
 * (`patientScope: "specific"`), e `subscribe` recusa um plano que não foi
 * oferecido a ele. Quem faltava era a tela: o único consumidor dessa API
 * vivia no módulo BA, então o paciente da clínica não tinha onde ver — nem
 * assinar — um plano feito para ele.
 *
 * Cancelar fica aqui também. Assinatura que só a clínica cancela é armadilha.
 */
export default function ClinicPlans() {
  const t = useTheme();
  const lang = useLang();
  const qc = useQueryClient();
  const plans = useQuery({ queryKey: ["plans"], queryFn: fetchPlans });
  const sub = useQuery({ queryKey: ["subscription"], queryFn: fetchSubscription });
  const [notice, setNotice] = useState<string | null>(null);

  // O Checkout abre fora e volta por deep link; sem isto a tela continuava
  // mostrando "sem plano" depois de um pagamento que deu certo.
  useEffect(() => {
    const handler = ({ url }: { url: string }) => {
      if (!url.includes("membership") && !url.includes("plans")) return;
      const status = new URL(url).searchParams.get("status");
      if (status === "success") setNotice(tr(lang, { en: "Your plan is active.", pt: "Seu plano está ativo." }));
      else if (status === "cancelled") setNotice(tr(lang, { en: "Payment cancelled. Nothing was charged.", pt: "Pagamento cancelado. Nada foi cobrado." }));
      qc.invalidateQueries({ queryKey: ["subscription"] });
    };
    const s = Linking.addEventListener("url", handler);
    return () => s.remove();
  }, [qc, lang]);

  const subscribeMutation = useMutation({
    mutationFn: (planId: string) => subscribeToPlan(planId),
    onSuccess: (res) => {
      if (res.checkoutUrl) {
        // Dentro do app, e a folha fecha sozinha quando o Stripe volta (083).
        setNotice(tr(lang, { en: "Opening secure payment…", pt: "Abrindo o pagamento seguro…" }));
        openCheckout(res.checkoutUrl)
          .then((r) => {
            if (r === "cancelled") setNotice(tr(lang, { en: "Payment cancelled. Nothing was charged.", pt: "Pagamento cancelado. Nada foi cobrado." }));
            else setNotice(null);
            // O webhook é quem ativa; a tela só vai ver quando reler.
            qc.invalidateQueries({ queryKey: ["subscription"] });
          })
          .catch(() =>
            setNotice(tr(lang, { en: "We could not open the payment page.", pt: "Não foi possível abrir a página de pagamento." }))
          );
      } else {
        setNotice(res.message || tr(lang, { en: "Your plan is active.", pt: "Seu plano está ativo." }));
        qc.invalidateQueries({ queryKey: ["subscription"] });
      }
    },
    onError: (e) => setNotice((e as Error).message || tr(lang, { en: "That did not go through.", pt: "Não deu certo." })),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: (res) => {
      setNotice(res.message || tr(lang, { en: "Your plan was cancelled.", pt: "Seu plano foi cancelado." }));
      qc.invalidateQueries({ queryKey: ["subscription"] });
    },
    onError: (e) => setNotice((e as Error).message || tr(lang, { en: "That did not go through.", pt: "Não deu certo." })),
  });

  const confirmCancel = () =>
    Alert.alert(
      tr(lang, { en: "Cancel your plan?", pt: "Cancelar seu plano?" }),
      tr(lang, {
        en: "If you have paid for this period, your access continues until it ends.",
        pt: "Se você já pagou este período, o acesso continua até ele terminar.",
      }),
      [
        { text: tr(lang, { en: "Keep it", pt: "Manter" }), style: "cancel" },
        { text: tr(lang, { en: "Cancel plan", pt: "Cancelar plano" }), style: "destructive", onPress: () => cancelMutation.mutate() },
      ]
    );

  const currentSub = sub.data?.subscription;
  const currentPlan = currentSub?.plan;
  const lista = plans.data ?? [];
  const outros = lista.filter((p) => p.id !== currentPlan?.id);

  return (
    <Screen scroll testID="clinic-plans-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: tr(lang, { en: "Plans", pt: "Planos" }),
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={{ gap: 16 }}>
        <View>
          <Text variant="title">{tr(lang, { en: "Plans", pt: "Planos" })}</Text>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 2 }}>
            {tr(lang, {
              en: "What your clinic offers you. Some plans are for everyone; some were made for you.",
              pt: "O que a sua clínica oferece a você. Alguns planos são para todos; alguns foram feitos para você.",
            })}
          </Text>
        </View>

        {notice && (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="information-circle-outline" size={18} color={t.colors.health} />
              <Text variant="caption" color={t.colors.textSecondary} testID="plans-notice">{notice}</Text>
            </View>
          </Card>
        )}

        {currentPlan && (
          <Card variant="highlight" testID="plans-current">
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text variant="label" style={{ fontWeight: "600" }}>
                {tr(lang, { en: "Your plan", pt: "Seu plano" })}
              </Text>
              <View
                style={{
                  backgroundColor: currentSub?.cancelAtPeriodEnd ? t.colors.warnSoft : t.colors.okSoft,
                  paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
                }}
              >
                <Text variant="caption" color={currentSub?.cancelAtPeriodEnd ? t.colors.warn : t.colors.ok} style={{ fontWeight: "700", fontSize: 11 }}>
                  {currentSub?.cancelAtPeriodEnd
                    ? tr(lang, { en: "Ends soon", pt: "Termina em breve" })
                    : tr(lang, { en: "Active", pt: "Ativo" })}
                </Text>
              </View>
            </View>
            <Text variant="subtitle" style={{ fontSize: 20 }}>{currentPlan.name}</Text>
            {currentPlan.description ? (
              <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 4 }}>{currentPlan.description}</Text>
            ) : null}
            {currentSub && !currentSub.cancelAtPeriodEnd && (
              <Button
                title={tr(lang, { en: "Cancel plan", pt: "Cancelar plano" })}
                variant="ghost" size="sm" style={{ marginTop: 12 }}
                onPress={confirmCancel} loading={cancelMutation.isPending} testID="plans-cancel"
              />
            )}
          </Card>
        )}

        {plans.isLoading ? (
          <Spinner center />
        ) : plans.isError ? (
          <Card>
            <Text color={t.colors.bad}>{tr(lang, { en: "We could not load your plans.", pt: "Não foi possível carregar seus planos." })}</Text>
          </Card>
        ) : outros.length === 0 ? (
          <Card>
            <Text variant="caption" color={t.colors.textSecondary} testID="plans-empty">
              {currentPlan
                ? tr(lang, { en: "Nothing else to add right now.", pt: "Nada mais a acrescentar por enquanto." })
                : tr(lang, { en: "Your clinic has no plans for you at the moment.", pt: "Sua clínica não tem planos para você no momento." })}
            </Text>
          </Card>
        ) : (
          <View style={{ gap: 12 }}>
            {outros.map((item) => (
              <Card key={item.id} testID={`plan-${item.id}`}>
                <Text variant="subtitle">{item.name}</Text>
                {item.description ? (
                  <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 4 }}>{item.description}</Text>
                ) : null}
                <Text variant="label" color={t.colors.health} style={{ fontWeight: "700", marginTop: 8 }}>
                  {item.isFree || item.price === 0
                    ? tr(lang, { en: "Included", pt: "Incluído" })
                    : `£${item.price.toFixed(2)} / ${String(item.interval).toLowerCase()}`}
                </Text>
                <Button
                  title={
                    item.isFree || item.price === 0
                      ? tr(lang, { en: "Activate", pt: "Ativar" })
                      : tr(lang, { en: "Subscribe", pt: "Assinar" })
                  }
                  variant="health" size="md" style={{ marginTop: 10 }}
                  onPress={() => subscribeMutation.mutate(item.id)}
                  loading={subscribeMutation.isPending && subscribeMutation.variables === item.id}
                  disabled={subscribeMutation.isPending}
                  testID={`plan-subscribe-${item.id}`}
                />
              </Card>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
