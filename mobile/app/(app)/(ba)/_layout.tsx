import { Stack } from "expo-router";
import ModuleGuard from "@/components/ModuleGuard";
import { HeaderBack } from "@/components/HeaderBack";

import { useTheme } from "@/theme/useTheme";
export default function BALayout() {
  const t = useTheme();
  return (
    <ModuleGuard module="ba">
      <Stack screenOptions={{
        // Estava `false` no grupo inteiro: quem entrava no módulo não tinha
        // como voltar, nem para trocar de área nem para sair de uma tela
        // bloqueada. Cada tela desenha o próprio título grande no conteúdo,
        // então o header entra só com a seta — sem repetir o nome.
        headerShown: true,
        headerTitle: "",
        // String vazia em `headerBackTitle` não esconde nada: o iOS a trata
        // como ausente e cai no nome da rota anterior, que é o nome de um
        // grupo — com parênteses, na tela do paciente.
        // O botão nativo aparecia e não navegava — diagnosticado errado três
        // vezes. `headerLeft` põe um que é nosso: ele chama `goBackOr()`, que
        // volta quando há para onde e vai para a casa do paciente quando não há.
        // O toque sempre faz alguma coisa.
        headerBackButtonDisplayMode: "minimal" as const,
        headerLeft: () => <HeaderBack />,
        headerStyle: { backgroundColor: t.colors.background },
        headerTintColor: t.colors.text,
        headerShadowVisible: false,
      }}

      >

        {/* As abas trazem a própria navegação e o próprio título. Sem

            declarar isto, o header do grupo aparecia vazio por cima

            delas — e no laboratório empilhava dois headers. Regressão

            que eu introduzi ao ligar `headerShown` no grupo. */}

        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      </Stack>
    </ModuleGuard>
  );
}
