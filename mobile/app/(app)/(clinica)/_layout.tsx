import { Stack } from "expo-router";
import ModuleGuard from "@/components/ModuleGuard";

export default function ClinicaLayout() {
  return (
    <ModuleGuard module="clinica">
      <Stack
        screenOptions={{
          headerShown: false,
          // Sem isto o iOS rotula o botão de voltar com o nome da rota
          // anterior — e a rota anterior é um grupo, então aparecia
          // literalmente "(tabs)" na tela do paciente. A seta sozinha diz o
          // que precisa dizer (achado no iPhone, 24/09/2026).
          // `headerBackTitle: ""` não esconde nada: o iOS trata a string vazia como
        // ausente e cai no nome da rota anterior — que é o nome do GRUPO, daí o
        // paciente lendo "(tabs)" e "(clinica)" no botão de voltar. A
        // documentação do próprio native-stack manda usar isto:
        headerBackButtonDisplayMode: "minimal" as const,
        }}
      />
    </ModuleGuard>
  );
}
