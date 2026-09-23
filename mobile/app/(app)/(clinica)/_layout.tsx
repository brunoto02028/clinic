import { Stack } from "expo-router";
import ModuleGuard from "@/components/ModuleGuard";

export default function ClinicaLayout() {
  return (
    <ModuleGuard module="clinica">
      <Stack screenOptions={{ headerShown: false }} />
    </ModuleGuard>
  );
}
