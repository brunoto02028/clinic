/**
 * Dá para comprar um exame hoje? (081)
 *
 * Só quando as duas pontas existem: o laboratório (token da API, T-5) e a
 * cobrança (Stripe, T-6). Antes disso o catálogo é vitrine — a tela diz que
 * a compra abre em breve, em vez de um botão que promete e falha.
 */
export function labOrderingEnabled(): boolean {
  return !!process.env.LML_API_KEY && !!process.env.STRIPE_SECRET_KEY && process.env.LAB_ORDERING_ENABLED === "true";
}
