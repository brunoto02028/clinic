import { Stack } from "expo-router";
import ModuleGuard from "@/components/ModuleGuard";

export default function LabLayout() {
  return (
    <ModuleGuard module="lab">
      <Stack screenOptions={{ headerShown: false }} />
    </ModuleGuard>
  );
}
