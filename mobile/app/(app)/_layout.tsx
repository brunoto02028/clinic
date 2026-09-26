import { Redirect, Stack } from "expo-router";
import { HeaderBack } from "@/components/HeaderBack";
import { Screen, Spinner } from "@/components/ui";
import { useAuth } from "@/store/auth";
import { useSessionPing } from "@/lib/session-ping";

/** Route guard: only authenticated sessions reach screens in this group. */
export default function AppLayout() {
  const status = useAuth((s) => s.status);

  /**
   * O sinal de uso (085, T-1).
   *
   * Aqui, e não na raiz, porque este layout é o que só existe para quem está
   * autenticado — é a definição de "usando o app". E antes de qualquer `return`
   * condicional: mover o hook para depois deles o faria montar e desmontar
   * conforme o status, e cada remontagem começaria uma sessão.
   *
   * `locked` conta como uso: a tranca é uma cortina, a pessoa está com o app
   * aberto e volta em segundos.
   */
  useSessionPing(status === "authenticated" || status === "locked");

  if (status === "loading") {
    return (
      <Screen>
        <Spinner center />
      </Screen>
    );
  }

  // `locked` NÃO aparece aqui de propósito. Era um <Redirect href="/lock">,
  // que troca este <Stack> por outra coisa — e um <Stack> remontado nasce sem
  // histórico, então dois minutos em segundo plano quebravam o botão de voltar
  // em todas as telas. A tranca agora é uma cortina na raiz
  // (components/LockOverlay), que cobre sem desmontar.
  if (status !== "authenticated" && status !== "locked") {
    // Never `/`: seven files resolve to it — the root welcome screen and the
    // index of every module group, since a (group) adds no path segment. The
    // router could land back inside this layout, which would redirect again,
    // for ever ("Maximum update depth exceeded" — the freeze on sign-out).
    return <Redirect href="/login" />;
  }

  /**
   * O sétimo Stack.
   *
   * Corrigi o botão de voltar nos seis layouts de módulo e **esqueci deste** —
   * e é aqui que vivem "Editar perfil", "Notificações" e "Alterar senha", as
   * três telas que o paciente alcança pelo perfil. Elas ligam o header na mão,
   * e sem estas opções o iOS rotulava o voltar com o nome da rota anterior:
   * "(clinica)". Foi exatamente essa tela que o Bruno fotografou, depois de eu
   * afirmar que o problema estava resolvido. Achado pela verificação
   * adversarial de 24/09/2026.
   *
   * `headerShown: false` continua sendo o padrão porque os grupos de módulo
   * desenham o próprio header; o que muda é que, quando uma tela daqui pede
   * header, ela recebe o nosso botão em vez do nativo.
   */
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerBackButtonDisplayMode: "minimal",
        headerLeft: () => <HeaderBack />,
      }}
    />
  );
}
