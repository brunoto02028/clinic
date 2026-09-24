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

/**
 * Se dá para tentar uma requisição.
 *
 * O NetInfo separa "tem rede" de "a rede leva a algum lugar":
 * `isInternetReachable` é `null` enquanto ele ainda não sabe, e tratar esse
 * `null` como offline deixaria o app parado logo ao abrir, antes da primeira
 * sondagem — sem tentar nada, esperando uma resposta que só chega depois.
 * Desconhecido vale como online: a tentativa falha rápido se não houver rede,
 * e falhar é mais barato do que não tentar.
 *
 * Só a combinação explícita "conectado, mas não chega a lugar nenhum" conta
 * como offline — o wi-fi do café com portal de login é exatamente isso.
 */
export function canReachNetwork(state: {
  isConnected?: boolean | null;
  isInternetReachable?: boolean | null;
}): boolean {
  if (state.isConnected === false) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}
