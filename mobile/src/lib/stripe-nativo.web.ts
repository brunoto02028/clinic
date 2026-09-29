/**
 * O que o navegador recebe no lugar do Stripe nativo.
 *
 * Pagar pela folha do Stripe é uma coisa de aplicativo: a folha é nativa, e
 * Apple Pay e Google Pay não existem numa aba. O web do paciente também não é
 * alvo — o aplicativo é. Este arquivo existe para que **o bundle web compile**,
 * e com ele o QA volte a conseguir abrir as telas do app no navegador.
 *
 * Ele não finge que pagou. `initPaymentSheet` devolve o mesmo formato de erro
 * que a tela já sabe ler — `{ error: { message, code } }` —, com uma frase que
 * diz a verdade: isto se faz no aplicativo.
 */
import type { ReactNode } from "react";
import { createElement, Fragment } from "react";

const RECUSA = {
  error: {
    message: "Paying happens in the app — open it on your phone to pay this invoice.",
    code: "Unsupported",
  },
} as const;

/** No web ele é transparente: desenha os filhos e não instala nada. */
export function StripeProvider({ children }: { children?: ReactNode; publishableKey?: string }) {
  return createElement(Fragment, null, children);
}

export function useStripe() {
  return {
    initPaymentSheet: async () => RECUSA,
    presentPaymentSheet: async () => RECUSA,
  };
}
