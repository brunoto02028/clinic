import { Stack } from "expo-router";
import ModuleGuard from "@/components/ModuleGuard";

export default function BALayout() {
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
        headerBackButtonDisplayMode: "minimal" as const,
        headerStyle: { backgroundColor: "#F5F4F1" },
        headerTintColor: "#20242D",
        headerShadowVisible: false,
      }} />
    </ModuleGuard>
  );
}
