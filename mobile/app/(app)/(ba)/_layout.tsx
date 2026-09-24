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
        // `headerBackTitle: ""` não esconde nada: o iOS trata a string vazia como
        // ausente e cai no nome da rota anterior — que é o nome do GRUPO, daí o
        // paciente lendo "(tabs)" e "(clinica)" no botão de voltar. A
        // documentação do próprio native-stack manda usar isto:
        headerBackButtonDisplayMode: "minimal" as const,
        headerStyle: { backgroundColor: "#F5F4F1" },
        headerTintColor: "#20242D",
        headerShadowVisible: false,
      }} />
    </ModuleGuard>
  );
}
