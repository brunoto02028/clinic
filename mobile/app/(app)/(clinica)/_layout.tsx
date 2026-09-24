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
          headerBackTitle: "",
        }}
      />
    </ModuleGuard>
  );
}
