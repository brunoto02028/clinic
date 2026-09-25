import { QueryClient } from "@tanstack/react-query";

/**
 * The app's single QueryClient, in a module of its own so the auth store can
 * reach it.
 *
 * It used to be created inside app/_layout.tsx, where nothing else could touch
 * it — so signing out cleared the tokens and left every cached query in place.
 * On a shared phone that is a cross-account leak with teeth: user A signs out,
 * user B signs in within the cache lifetime, the screening wizard opens with
 * A's cached screening, B's own refetch returns nothing to overwrite it, and
 * the first autosave writes A's health data — red flags included — into B's
 * account. The module guard likewise decided on A's modules until the refetch
 * landed. `clearSessionCache` is called on every identity change.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // Estava `false`, e era o motivo de o app nunca mostrar o que a clínica
      // mudava: as abas não desmontam durante a sessão, então `refetchOnMount`
      // nunca disparava de novo e a tela ficava congelada no estado da
      // primeira abertura. Em React Native "foco de janela" não existe por si
      // — quem traduz `AppState` em foco é `lib/app-focus.ts`, e sem estas
      // duas coisas juntas nenhuma das duas faz nada (075, T-12).
      refetchOnWindowFocus: true,
      // Volta a ter rede: tenta de novo sozinho em vez de deixar a tela de
      // erro até alguém puxar para atualizar.
      refetchOnReconnect: true,
      // Sem isto, o `onlineManager` marcando offline faz o React Query nem
      // tentar: a query fica `paused`, o que não é `isLoading` nem `isError`.
      // Nenhuma tela do app trata esse estado — o resultado seria tela vazia
      // e muda, sem spinner, sem erro e sem "tentar de novo", e o `ModuleGuard`
      // chegaria a redirecionar o paciente para fora da área da clínica.
      // `offlineFirst` tenta assim mesmo: falha vira erro de verdade, que as
      // telas já sabem mostrar (code review da T-12).
      networkMode: "offlineFirst",
    },
    mutations: { networkMode: "offlineFirst" },
  },
});

/** Drop everything cached for the previous identity. Cancels in-flight
 *  queries first, so a slow response for the old user cannot land after the
 *  clear and repopulate the cache. */
export async function clearSessionCache(): Promise<void> {
  await queryClient.cancelQueries();
  queryClient.clear();
}
