import * as WebBrowser from "expo-web-browser";

/**
 * Pagar sem sair do app (083, 26/09/2026).
 *
 * Todo checkout do Stripe abria com `Linking.openURL`, que **entrega a pessoa
 * ao Safari e acabou**: ela paga fora, cai numa página do site, e tem de
 * descobrir sozinha o caminho de volta — no meio de um pagamento, que é
 * exatamente o momento em que não se pode perder ninguém.
 *
 * `openAuthSessionAsync` abre a mesma página do Stripe numa folha **dentro do
 * app**, e fecha sozinha quando o Stripe redireciona para o nosso esquema
 * (`bprclinic://…`). A pessoa nunca sai; ao voltar, a tela sabe o que houve.
 *
 * Nada de cartão passa por aqui: quem cobra é o Stripe, na página dele.
 */
export type CheckoutOutcome = "paid" | "cancelled" | "dismissed";

export async function openCheckout(url: string): Promise<CheckoutOutcome> {
  const r = await WebBrowser.openAuthSessionAsync(url, "bprclinic://", {
    // As cores do app, para a folha não parecer outro produto.
    toolbarColor: "#F3F2EE",
    controlsColor: "#4F7361",
    // Sessão limpa: o Checkout não herda cookie de ninguém.
    preferEphemeralSession: true,
  });

  if (r.type !== "success") {
    // `dismiss` é a pessoa fechando a folha — não sabemos se pagou, e dizer
    // que cancelou seria inventar. Quem chama recarrega e olha o estado real.
    return "dismissed";
  }
  return r.url.includes("status=cancelled") || r.url.includes("cancelled=1") ? "cancelled" : "paid";
}
