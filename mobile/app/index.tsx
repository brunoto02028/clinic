import { Redirect } from "expo-router";
import { Screen, Spinner } from "@/components/ui";
import { useAuth } from "@/store/auth";

/** Entry gate: routes to home or login based on the restored session. */
export default function Index() {
  const status = useAuth((s) => s.status);

  if (status === "loading") {
    return (
      <Screen testID="boot-screen">
        <Spinner center />
      </Screen>
    );
  }

  return <Redirect href={status === "authenticated" ? "/home" : "/login"} />;
}
