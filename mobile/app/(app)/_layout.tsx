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
    // Never `/`: seven files resolve to it — the root welcome screen and the
    // index of every module group, since a (group) adds no path segment. The
    // router could land back inside this layout, which would redirect again,
    // for ever ("Maximum update depth exceeded" — the freeze on sign-out).
    return <Redirect href="/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
