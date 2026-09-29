import { useState } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
/**
 * Pelo módulo da casa, e não pelo pacote direto: o pacote nativo derruba o
 * bundle **web** inteiro, e com ele a única forma de o QA abrir as telas do app
 * num navegador. Ver `src/lib/stripe-nativo.ts`.
 */
import { StripeProvider, useStripe } from "@/lib/stripe-nativo";
import { Screen, Text, Card, Button, Spinner } from "@/components/ui";
import { openFileInApp } from "@/components/FileViewer";
import { fetchInvoices, iniciarPagamento, type Invoice, type InvoiceItem } from "@/api/invoices";
import { ApiError } from "@/api/client";
import { formatDate } from "@/lib/format";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";

/**
 * As faturas do paciente — ver, abrir o PDF, e pagar sem sair do app.
 *
 * ## O buraco que isto fecha
 *
 * A clínica emite a fatura, numera, gera o PDF com o logo da BPR e manda por
 * e-mail depois que alguém aprova. E o paciente **não tinha onde ver**: nem
 * aqui, nem na web. Quem apagasse o e-mail ficava sem a fatura — e o app é o
 * único lugar do paciente depois do lançamento.
 *
 * ## Por que o PaymentSheet, e não a folha do Checkout
 *
 * A consulta é paga abrindo a página do Stripe numa folha de navegador dentro
 * do app. Funciona, e ainda é uma página web dentro de um app. O PaymentSheet é
 * a folha que o **sistema** desenha: teclado de cartão nativo, Apple Pay no
 * iPhone, Google Pay no Android. A pessoa não troca de contexto em momento
 * nenhum — e no meio de um pagamento é onde menos se pode perder alguém.
 *
 * Nenhum número de cartão passa por esta tela nem pelo nosso servidor: o que o
 * app recebe é o `client_secret` de uma cobrança, e quem cobra é o Stripe.
 */

function corDoStatus(status: Invoice["status"], t: any) {
  if (status === "PAID") return { fundo: t.colors.okSoft, texto: t.colors.ok };
  if (status === "OVERDUE") return { fundo: t.colors.badSoft ?? t.colors.warnSoft, texto: t.colors.bad ?? t.colors.warn };
  return { fundo: t.colors.warnSoft, texto: t.colors.warn };
}

function rotuloDoStatus(status: Invoice["status"], lang: "en" | "pt") {
  switch (status) {
    case "PAID":
      return tr(lang, { en: "Paid", pt: "Paga" });
    case "OVERDUE":
      return tr(lang, { en: "Overdue", pt: "Vencida" });
    case "PARTIALLY_PAID":
      return tr(lang, { en: "Part paid", pt: "Parcial" });
    default:
      return tr(lang, { en: "Due", pt: "Em aberto" });
  }
}

/** £12.00 — o símbolo vem da moeda da própria fatura, não de um palpite. */
function dinheiro(valor: number, moeda: string, lang: "en" | "pt") {
  try {
    return new Intl.NumberFormat(lang === "pt" ? "pt-BR" : "en-GB", {
      style: "currency",
      currency: (moeda || "GBP").toUpperCase(),
    }).format(valor);
  } catch {
    return `${(moeda || "GBP").toUpperCase()} ${valor.toFixed(2)}`;
  }
}

function Faturas() {
  const lang = useLang();
  const t = useTheme();
  const qc = useQueryClient();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const { data, isLoading, isError } = useQuery({ queryKey: ["invoices"], queryFn: fetchInvoices });
  const [pagando, setPagando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const faturas = data?.invoices ?? [];

  const pagar = async (f: Invoice) => {
    setPagando(f.id);
    setAviso(null);
    try {
      const cobranca = await iniciarPagamento(f.id);

      const init = await initPaymentSheet({
        merchantDisplayName: "Bruno Physical Rehabilitation",
        paymentIntentClientSecret: cobranca.clientSecret,
        // O Google Pay está ligado no plugin e funciona no Android. O Apple
        // Pay fica declarado aqui e **não aparece** enquanto o entitlement não
        // existir — a folha cai no cartão, que é o comportamento certo.
        applePay: { merchantCountryCode: "GB" },
        googlePay: { merchantCountryCode: "GB", testEnv: cobranca.publishableKey.startsWith("pk_test_") },
        appearance: {
          colors: {
            primary: "#4F7361",
            background: t.colors.background,
            componentBackground: t.colors.surface,
            primaryText: t.colors.text,
            secondaryText: t.colors.textSecondary,
          },
        },
        /**
         * Nada de método que confirma depois (SEPA, Sofort e afins).
         *
         * O comentário que estava aqui dizia que isto era sobre tocar fora da
         * folha — não é, e o QA da 093 pegou a explicação errada. O que o campo
         * faz é aceitar, ou não, métodos cujo pagamento **só se confirma dias
         * depois**. Para uma fatura de clínica isso seria dizer "pago" a quem
         * ainda não pagou; o valor está certo, a razão é esta.
         */
        allowsDelayedPaymentMethods: false,
        /**
         * Para onde o 3DS2 volta.
         *
         * O banco britânico manda quase toda cobrança para a autenticação do
         * cartão, e ela abre uma página. Sem `returnURL` essa página não sabe
         * como devolver a pessoa ao app, e o pagamento fica preso numa tela que
         * não fecha. O esquema é o mesmo que o Checkout já usa.
         */
        returnURL: "bprclinic://invoices",
      });
      if (init.error) throw new Error(init.error.message);

      const r = await presentPaymentSheet();
      if (r.error) {
        /**
         * `Canceled` é a pessoa fechando a folha, e não é erro — dizer "não
         * deu certo" a quem decidiu não pagar é ruído. Qualquer outro código
         * é recusa do cartão ou falha de rede, e aí a frase do Stripe já vem
         * pronta para ser lida.
         */
        if (r.error.code !== "Canceled") {
          setAviso(r.error.message || tr(lang, { en: "The payment did not go through.", pt: "O pagamento não foi concluído." }));
        }
        return;
      }

      /**
       * Pagou. A fatura ainda não virou "paga" aqui: quem diz isso é o
       * webhook, e ele pode chegar segundos depois. Então a tela diz o que
       * aconteceu de verdade — o pagamento passou — e recarrega a lista,
       * em vez de fingir um estado que o servidor ainda não tem.
       */
      setAviso(
        tr(lang, {
          en: "Payment received. The invoice updates in a moment.",
          pt: "Pagamento recebido. A fatura é atualizada em instantes.",
        })
      );
      qc.invalidateQueries({ queryKey: ["invoices"] });
    } catch (e) {
      setAviso(
        e instanceof ApiError
          ? e.localizada(lang)
          : (e as Error).message ||
              tr(lang, { en: "Could not start the payment.", pt: "Não foi possível iniciar o pagamento." })
      );
    } finally {
      setPagando(null);
    }
  };

  // `Screen` já traz o puxar-para-atualizar em toda tela que rola.
  return (
    <Screen scroll testID="clinic-invoices-screen">
      <Stack.Screen
        options={{
          headerShown: true,
          title: tr(lang, { en: "Invoices", pt: "Faturas" }),
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />

      <View style={{ gap: 16 }}>
        <View>
          <Text variant="title">{tr(lang, { en: "Invoices", pt: "Faturas" })}</Text>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 2 }}>
            {tr(lang, {
              en: "What the clinic has charged you. Tap one to open the PDF.",
              pt: "O que a clínica cobrou de você. Toque em uma para abrir o PDF.",
            })}
          </Text>
        </View>

        {aviso && (
          <Card testID="invoices-notice">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="information-circle-outline" size={18} color={t.colors.health} />
              <Text variant="caption" color={t.colors.textSecondary} style={{ flex: 1 }}>
                {aviso}
              </Text>
            </View>
          </Card>
        )}

        {isLoading && <Spinner />}

        {isError && (
          <Card>
            <Text variant="caption" color={t.colors.textSecondary}>
              {tr(lang, {
                en: "We could not load your invoices. Pull down to try again.",
                pt: "Não foi possível carregar suas faturas. Puxe para tentar de novo.",
              })}
            </Text>
          </Card>
        )}

        {!isLoading && !isError && faturas.length === 0 && (
          <Card testID="invoices-empty">
            <View style={{ alignItems: "center", gap: 8, paddingVertical: 12 }}>
              <Ionicons name="receipt-outline" size={28} color={t.colors.textMuted} />
              <Text variant="caption" color={t.colors.textSecondary} style={{ textAlign: "center" }}>
                {tr(lang, {
                  en: "No invoices yet. One appears here when the clinic issues it.",
                  pt: "Nenhuma fatura ainda. Uma aparece aqui quando a clínica emitir.",
                })}
              </Text>
            </View>
          </Card>
        )}

        {faturas.map((f: Invoice) => {
          const cor = corDoStatus(f.status, t);
          return (
            <Card key={f.id} testID={`invoice-${f.invoiceNumber}`}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text variant="label" style={{ fontWeight: "600" }}>
                    {f.invoiceNumber}
                  </Text>
                  <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 2 }}>
                    {formatDate(f.issueDate, lang)}
                    {f.dueDate
                      ? ` · ${tr(lang, { en: "due", pt: "vence" })} ${formatDate(f.dueDate, lang)}`
                      : ""}
                  </Text>
                  {/* De quem é, quando não é de quem está olhando. Sem isto, a
                      mãe vê duas faturas iguais e não sabe qual é de quem. */}
                  {f.de && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                      <Ionicons name="person-outline" size={12} color={t.colors.textMuted} />
                      <Text variant="caption" color={t.colors.textMuted}>
                        {f.de}
                      </Text>
                    </View>
                  )}
                </View>
                <View
                  style={{
                    backgroundColor: cor.fundo,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                  }}
                >
                  <Text variant="caption" color={cor.texto} style={{ fontWeight: "700", fontSize: 11 }}>
                    {rotuloDoStatus(f.status, lang)}
                  </Text>
                </View>
              </View>

              <Text variant="subtitle" style={{ fontSize: 22, marginTop: 8 }}>
                {dinheiro(f.total, f.currency, lang)}
              </Text>
              {/* O que falta só importa quando é diferente do total: repetir o
                  mesmo número duas vezes faz a pessoa procurar a diferença. */}
              {f.status === "PARTIALLY_PAID" && f.outstanding > 0 && (
                <Text variant="caption" color={t.colors.warn} style={{ marginTop: 2 }}>
                  {tr(lang, { en: "Still to pay", pt: "Falta pagar" })}: {dinheiro(f.outstanding, f.currency, lang)}
                </Text>
              )}

              {f.items.length > 0 && (
                <View style={{ marginTop: 10, gap: 2 }}>
                  {f.items.map((it: InvoiceItem, i: number) => (
                    <Text key={i} variant="caption" color={t.colors.textSecondary}>
                      {it.quantity > 1 ? `${it.quantity}× ` : ""}
                      {it.description} — {dinheiro(it.total, f.currency, lang)}
                    </Text>
                  ))}
                </View>
              )}

              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <Button
                  title={tr(lang, { en: "Open PDF", pt: "Abrir PDF" })}
                  variant="ghost"
                  size="sm"
                  onPress={() => openFileInApp(f.openUrl)}
                  testID={`invoice-pdf-${f.invoiceNumber}`}
                />
                {f.payable && (
                  <Button
                    title={
                      pagando === f.id
                        ? tr(lang, { en: "Opening…", pt: "Abrindo…" })
                        : `${tr(lang, { en: "Pay", pt: "Pagar" })} ${dinheiro(f.outstanding, f.currency, lang)}`
                    }
                    size="sm"
                    disabled={pagando !== null}
                    onPress={() => pagar(f)}
                    testID={`invoice-pay-${f.invoiceNumber}`}
                  />
                )}
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

/**
 * A chave publicável vem com a lista, então o provedor só existe depois dela.
 *
 * Enquanto ela não chegou — ou quando pagar pelo app não está ligado, que é o
 * estado de produção hoje — a tela funciona igual: ver e abrir o PDF nunca
 * dependeram do Stripe, e nenhuma fatura volta `payable`, então não há botão
 * de pagar para ficar sem provedor embaixo.
 */
export default function InvoicesScreen() {
  const { data } = useQuery({ queryKey: ["invoices"], queryFn: fetchInvoices });
  const chave = data?.stripePublishableKey;

  if (!chave) return <Faturas />;
  /**
   * Sem `merchantIdentifier` enquanto o Apple Pay não estiver ligado.
   *
   * Passá-lo aqui não cria nada: o que liga o Apple Pay é o entitlement, que o
   * plugin só escreve com o identificador configurado em `app.json` — e ele
   * está vazio de propósito, porque o Merchant ID ainda não existe no portal da
   * Apple (094 B-5). Declarar um identificador que o app não tem era o código
   * dizendo uma coisa e o build outra, e o QA notou a contradição.
   */
  return (
    <StripeProvider publishableKey={chave}>
      <Faturas />
    </StripeProvider>
  );
}
