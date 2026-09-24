import { router } from "expo-router";

/**
 * Voltar, e se não houver para onde, ir para algum lugar.
 *
 * `router.back()` sozinho é uma aposta no histórico. Quando a pilha tem uma
 * entrada só, ele não faz **nada** — silenciosamente. É o pior tipo de falha
 * de navegação: o paciente aperta, a tela não muda, e não há erro para
 * explicar.
 *
 * Isso acontecia de verdade, e no pior lugar possível: o recém-cadastrado
 * entrava na avaliação por `replace`, preenchia as nove etapas, apertava
 * Enviar — e ficava olhando a mesma tela, com os dados salvos e nenhuma pista
 * disso. Achado na auditoria de navegação de 24/09/2026.
 *
 * O destino padrão é a casa do paciente. Não é um palpite sobre a intenção
 * dele: é a garantia de que o toque **sempre** faz alguma coisa.
 */
export const PATIENT_HOME = "/(app)/(clinica)/(tabs)";

export function goBackOr(fallback: string = PATIENT_HOME): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  // `replace`, não `push`: não há nada atrás para preservar, e empilhar a casa
  // por cima de si mesma criaria um voltar que anda em círculo.
  router.replace(fallback as never);
}
