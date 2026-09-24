import { AppState, type AppStateStatus, Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { API_URL } from "@/api/config";
import { focusManager, onlineManager } from "@tanstack/react-query";
import { shouldBeFocused, listensToAppState, canReachNetwork } from "./app-focus-rules";

export { shouldBeFocused, listensToAppState, canReachNetwork };

/**
 * Faz o app perceber que voltou.
 *
 * O que a clínica muda no admin não chegava ao paciente. As queries usam
 * `staleTime: 0` com `refetchOnMount`, o que só dispara quando a tela
 * **desmonta e remonta** — e as abas deste app nunca desmontam durante a
 * sessão. O terapeuta trocava o protocolo, revogava um módulo, marcava uma
 * consulta, e o paciente continuava vendo o estado antigo até fechar e abrir
 * o app. As invalidações que existem são todas disparadas por ação do próprio
 * paciente; nenhuma por mudança da clínica (auditoria de paridade 24/09, F5).
 *
 * O React Query já sabe revalidar ao recuperar o foco — só que "foco" no
 * navegador é a janela, e em React Native não existe janela. O `focusManager`
 * existe exatamente para isso, e ligá-lo ao `AppState` é o padrão que a
 * documentação deles indica para mobile. Sem isso, `refetchOnWindowFocus`
 * nunca dispara num celular, ligado ou desligado.
 *
 * `web` fica de fora de propósito: ali o comportamento de janela do próprio
 * React Query já é o certo, e sobrepor os dois daria refetch em dobro.
 */
/**
 * Faz o app perceber que a rede voltou.
 *
 *
 * Sem isto, perder o sinal no meio de uma tela deixava a mensagem de erro
 * parada até alguém puxar para atualizar — e o paciente que entra no elevador
 * volta achando que o app quebrou. O `onlineManager` é a outra metade do que
 * o `focusManager` faz: um diz "a pessoa voltou", o outro "a rede voltou", e
 * o React Query refaz o que estava pendente.
 */
export function wireNetwork(): () => void {
  // Mesma razão pela qual o foco não é ligado na web: ali o React Query já
  // escuta `online`/`offline` da própria janela, e sobrepor os dois é ruído.
  if (!listensToAppState(Platform.OS)) return () => {};

  // A sonda padrão do NetInfo é um host do Google, a cada 60 segundos, no
  // aparelho de um paciente. Duas coisas erradas nisso: é um beacon de
  // terceiro não declarado num app de saúde, e responde a pergunta errada —
  // uma rede que bloqueie o Google mas alcance a nossa API seria dada como
  // offline, e o app inteiro congelaria. Quem importa é a nossa API.
  // `version.json` é arquivo estático: responde sem tocar no banco. O
  // `/api/health` consulta o Postgres, e sondá-lo a cada minuto de cada
  // aparelho seria pagar caro para responder "a rede está de pé?".
  NetInfo.configure({
    reachabilityUrl: `${API_URL}/version.json`,
    // A sonda padrão deles espera 204; a nossa devolve 200 com o arquivo.
    reachabilityTest: async (response) => response.status >= 200 && response.status < 400,
  });

  return NetInfo.addEventListener((state) => {
    onlineManager.setOnline(canReachNetwork(state));
  });
}

export function wireAppFocus(): () => void {
  if (!listensToAppState(Platform.OS)) return () => {};

  const onChange = (status: AppStateStatus) => {
    focusManager.setFocused(shouldBeFocused(status));
  };

  const subscription = AppState.addEventListener("change", onChange);
  return () => subscription.remove();
}
