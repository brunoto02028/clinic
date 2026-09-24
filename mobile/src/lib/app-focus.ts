import { AppState, type AppStateStatus, Platform } from "react-native";
import { focusManager } from "@tanstack/react-query";
import { shouldBeFocused, listensToAppState } from "./app-focus-rules";

export { shouldBeFocused, listensToAppState };

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
export function wireAppFocus(): () => void {
  if (!listensToAppState(Platform.OS)) return () => {};

  const onChange = (status: AppStateStatus) => {
    focusManager.setFocused(shouldBeFocused(status));
  };

  const subscription = AppState.addEventListener("change", onChange);
  return () => subscription.remove();
}
