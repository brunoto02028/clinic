import { useState } from "react";
import { View, Alert, Pressable } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen, Text, Card, Input, Button } from "@/components/ui";
import { createLabOrder, fetchLabConsent, acceptLabConsent } from "@/api/labs";
import { fetchDependentes } from "@/api/dependents";
import { Ionicons } from "@expo/vector-icons";
import { ApiError } from "@/api/client";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";

/**
 * Endereço e pagamento (081). Só um método de coleta existe: o kit vai pelo
 * correio, então endereço e CEP são obrigatórios.
 *
 * O pagamento pelo Stripe entra na T-6; até lá o detalhe do exame não chega
 * aqui (a compra fica fechada pelo servidor), e esta tela cria só o pedido.
 */
export default function LabCheckout() {
  const t = useTheme();
  const lang = useLang();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id: string; name: string; price: string }>();
  const [address, setAddress] = useState({ line1: "", line2: "", city: "", postcode: "" });
  // Nulo e o proprio titular, que e o caso de quase todo pedido.
  const [paraQuem, setParaQuem] = useState<string | null>(null);
  const dependentes = useQuery({ queryKey: ["lab-dependents"], queryFn: fetchDependentes });

  // O aceite de quem vai fazer o exame, quando não é o titular (091 T-4).
  const consentDoSujeito = useQuery({
    queryKey: ["lab-consent", lang, paraQuem],
    queryFn: () => fetchLabConsent(lang === "pt" ? "pt-BR" : "en-GB", paraQuem),
    enabled: paraQuem !== null,
  });
  const aceitarPeloSujeito = useMutation({
    mutationFn: () => acceptLabConsent(paraQuem),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lab-consent"] }),
  });
  const price = parseFloat(params.price || "0");
  const total = `£${price.toFixed(2)}`;

  const mutation = useMutation({
    mutationFn: () =>
      createLabOrder({
        items: [{ productId: params.id, quantity: 1 }],
        dependentId: paraQuem,
        shippingAddress: [address.line1, address.line2, address.city].filter(Boolean).join(", "),
        shippingPostcode: address.postcode,
      }),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ["lab-orders"] });
      router.replace({ pathname: "/(app)/(lab)/order/[id]" as any, params: { id: order.id } });
    },
    onError: (e) => {
      const err = e as ApiError;
      Alert.alert(
        tr(lang, { en: "Could not place the order", pt: "Não foi possível fazer o pedido" }),
        err.code === "ordering_unavailable"
          ? tr(lang, { en: "Ordering is not open yet.", pt: "A compra ainda não está aberta." })
          : err.code === "shipping_required"
          ? tr(lang, { en: "The kit goes by post: address and postcode are required.", pt: "O kit vai pelo correio: endereço e CEP são obrigatórios." })
          // A recusa por idade é do servidor, e a mensagem dele nomeia o exame
          // — repetir aqui uma frase genérica esconderia qual dos exames é.
          : err.code === "age_restricted"
          ? err.localizada(lang)
          : err.message
      );
    },
  });

  const addressValid = !!(address.line1.trim() && address.city.trim() && address.postcode.trim());
  // Pedir para si: o aceite ja foi dado na pagina do exame. Pedir por outra
  // pessoa: e o aceite **dela** que falta, e o botao espera por ele.
  const consentPronto = paraQuem === null || consentDoSujeito.data?.accepted === true;

  return (
    <Screen scroll testID="lab-checkout-screen">
      <Stack.Screen options={{
        headerShown: true, title: tr(lang, { en: "Checkout", pt: "Finalizar" }),
        headerStyle: { backgroundColor: t.colors.background },
        headerTintColor: t.colors.text, headerShadowVisible: false,
      }} />
      <View style={{ gap: 16 }}>
        <Card>
          <Text variant="label" style={{ fontFamily: "Sora_600SemiBold", marginBottom: 4 }}>{tr(lang, { en: "Order summary", pt: "Resumo do pedido" })}</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
            <Text variant="body">{params.name}</Text>
            <Text variant="body" style={{ fontFamily: "Sora_700Bold" }}>{total}</Text>
          </View>
          <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 4 }}>
            {tr(lang, { en: "Home kit, by post. Finger-prick sample.", pt: "Kit de casa, pelo correio. Amostra por picada no dedo." })}
          </Text>
        </Card>

        {/* Para quem é o exame (091 T-3).
            Só aparece quando há alguém cadastrado: uma conta que pede só para
            si não tem por que responder a uma pergunta que tem uma resposta
            só. O caminho para cadastrar fica logo abaixo, para quem precisa. */}
        <Card testID="lab-para-quem">
          <Text variant="label" style={{ fontFamily: "Sora_600SemiBold", marginBottom: 10 }}>
            {tr(lang, { en: "Who is this test for?", pt: "Para quem é este exame?" })}
          </Text>
          {/* A lista só existe quando há mais de uma resposta possível. Um
              botão de rádio sozinho não é escolha, é enfeite. */}
          <View style={{ gap: 8, display: (dependentes.data ?? []).length > 0 ? "flex" : "none" }}>
            {[{ id: null as string | null, nome: tr(lang, { en: "Me", pt: "Eu" }), idade: null as number | null }, ...(dependentes.data ?? []).map((d) => ({ id: d.id, nome: `${d.firstName} ${d.lastName}`, idade: d.idade }))].map((o) => {
              const escolhido = paraQuem === o.id;
              return (
                <Pressable
                  key={o.id ?? "eu"}
                  onPress={() => setParaQuem(o.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: escolhido }}
                  testID={`para-${o.id ?? "eu"}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: escolhido ? t.colors.lab : t.colors.border,
                    backgroundColor: escolhido ? t.colors.labSoft : "transparent",
                  }}
                >
                  <Ionicons
                    name={escolhido ? "radio-button-on" : "radio-button-off"}
                    size={18}
                    color={escolhido ? t.colors.lab : t.colors.textMuted}
                  />
                  <Text variant="body" style={{ flex: 1, fontSize: 13 }}>{o.nome}</Text>
                  {o.idade != null && (
                    <Text variant="caption" color={t.colors.textMuted}>
                      {tr(lang, { en: `${o.idade} yrs`, pt: `${o.idade} anos` })}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={() => router.push("/(app)/(lab)/dependents")}
            hitSlop={8}
            style={{ marginTop: 10 }}
            testID="lab-cadastrar-dependente"
          >
            <Text variant="caption" color={t.colors.lab} style={{ fontWeight: "600" }}>
              {tr(lang, { en: "Order for someone I look after", pt: "Pedir para alguém de quem eu cuido" })}
            </Text>
          </Pressable>
          {paraQuem !== null && (
            <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 8, lineHeight: 18 }}>
              {tr(lang, {
                en: "The test comes out in their name, and the result comes to you.",
                pt: "O exame sai no nome dessa pessoa, e o resultado chega a você.",
              })}
            </Text>
          )}
        </Card>

        {/* O aviso de quem não é o titular (091 T-4).
            O consentimento é perguntado na página do exame, mas o sujeito só é
            escolhido aqui — e o aceite que vale é o **dele**, porque é o exame
            dele que vai acontecer. Sem este bloco, escolher a filha levaria a
            uma recusa do servidor no fim do caminho, depois de preencher o
            endereço inteiro. */}
        {/* Enquanto o aceite dela carrega, o botão de pagar fica travado. Sem
            esta linha ele ficava travado **sem nada na tela dizendo por quê** —
            numa rede lenta, um botão morto. Achado do review de 27/09/2026. */}
        {paraQuem !== null && consentDoSujeito.isLoading && (
          <Card testID="consent-carregando">
            <Text variant="caption" color={t.colors.textSecondary}>
              {tr(lang, { en: "Checking the notice for this person…", pt: "Conferindo o aviso desta pessoa…" })}
            </Text>
          </Card>
        )}

        {paraQuem !== null && consentDoSujeito.data && !consentDoSujeito.data.accepted && (
          <Card testID="consent-do-sujeito">
            <Text variant="label" style={{ fontFamily: "Sora_600SemiBold", marginBottom: 8 }}>
              {consentDoSujeito.data.text.title}
            </Text>
            <View style={{ gap: 8 }}>
              {consentDoSujeito.data.text.points.map((p, i) => (
                <Text key={i} variant="caption" color={t.colors.textSecondary} style={{ lineHeight: 18 }}>
                  {p}
                </Text>
              ))}
            </View>
            <Button
              title={
                aceitarPeloSujeito.isPending
                  ? tr(lang, { en: "Saving…", pt: "Salvando…" })
                  : consentDoSujeito.data.text.accept
              }
              variant="primary"
              style={{ backgroundColor: t.colors.lab, marginTop: 12 }}
              disabled={aceitarPeloSujeito.isPending}
              onPress={() => aceitarPeloSujeito.mutate()}
              testID="aceitar-consent-sujeito"
            />
          </Card>
        )}

        <Card>
          <Text variant="label" style={{ fontFamily: "Sora_600SemiBold", marginBottom: 10 }}>{tr(lang, { en: "Delivery address", pt: "Endereço de entrega" })}</Text>
          <View style={{ gap: 4 }}>
            <Input label={tr(lang, { en: "Address line 1", pt: "Endereço" })} value={address.line1} onChangeText={(v) => setAddress((a) => ({ ...a, line1: v }))} />
            <Input label={tr(lang, { en: "Address line 2 (optional)", pt: "Complemento (opcional)" })} value={address.line2} onChangeText={(v) => setAddress((a) => ({ ...a, line2: v }))} />
            <Input label={tr(lang, { en: "City", pt: "Cidade" })} value={address.city} onChangeText={(v) => setAddress((a) => ({ ...a, city: v }))} />
            <Input label={tr(lang, { en: "Postcode", pt: "CEP" })} value={address.postcode} onChangeText={(v) => setAddress((a) => ({ ...a, postcode: v }))} autoCapitalize="characters" testID="lab-postcode" />
          </View>
          {!addressValid && (
            <Text variant="caption" color={t.colors.textMuted} style={{ marginTop: 6 }}>
              {tr(lang, { en: "Address, city and postcode are required — the kit goes by post.", pt: "Endereço, cidade e CEP são obrigatórios — o kit vai pelo correio." })}
            </Text>
          )}
        </Card>

        <Button
          title={mutation.isPending ? tr(lang, { en: "Placing order…", pt: "Fazendo o pedido…" }) : tr(lang, { en: `Continue to payment · ${total}`, pt: `Continuar para o pagamento · ${total}` })}
          variant="primary" size="lg" testID="lab-pay"
          onPress={() => mutation.mutate()}
          disabled={!addressValid || !consentPronto || mutation.isPending} loading={mutation.isPending}
        />
      </View>
    </Screen>
  );
}
