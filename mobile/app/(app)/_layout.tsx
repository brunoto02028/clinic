import { Redirect, Stack } from "expo-router";
import { Screen, Spinner } from "@/components/ui";
import { useAuth } from "@/store/auth";

/** Route guard: only authenticated sessions reach screens in this group. */
export default function AppLayout() {
  const status = useAuth((s) => s.status);

  if (status === "loading") {
    return (
      <Screen>
        <Spinner center />
      </Screen>
    );
  }

  if (status !== "authenticated") {
    return <Redirect href="/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
