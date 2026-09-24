/**
 * As duas decisões, sem encanamento nenhum.
 *
 * Ficam em arquivo próprio porque `app-focus.ts` importa `react-native`, e um
 * teste que precise do runtime do RN para verificar `status === "active"` é
 * teste do jest, não do produto. Aqui não há import de nada.
 */

/**
 * Só `active` conta como foco.
 *
 * `inactive` é o estado de transição do iOS — central de controle aberta, uma
 * chamada chegando. O que importa é o par: sair dele e voltar para `active`
 * revalida, e é isso que faz o paciente ver o que a clínica mudou.
 */
export function shouldBeFocused(status: string): boolean {
  return status === "active";
}

/**
 * O alvo web fica de fora: ali o React Query já observa a janela sozinho, e
 * ligar os dois daria refetch em dobro.
 */
export function listensToAppState(os: string): boolean {
  return os !== "web";
}
