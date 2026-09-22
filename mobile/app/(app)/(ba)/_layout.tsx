import { Stack } from "expo-router";
import ModuleGuard from "@/components/ModuleGuard";

export default function BALayout() {
  return (
    <ModuleGuard module="ba">
      <Stack screenOptions={{ headerShown: false }} />
    </ModuleGuard>
  );
}
