import { Stack } from "expo-router";
import { HeaderBack } from "@/components/HeaderBack";

export default function TreinoLayout() {
  return <Stack screenOptions={{
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
        headerStyle: { backgroundColor: "#F5F4F1" },
        headerTintColor: "#20242D",
        headerShadowVisible: false,
      }} />;
}
