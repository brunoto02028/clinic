import { Redirect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, Spinner } from "@/components/ui";
import { fetchModules, type AppModule } from "@/api/modules";

/**
 * Route guard for a module's route group.
 *
 * `/api/mobile/modules` decides which modules a user may reach, but its answer
 * only ever fed the chooser's list — nothing stopped a direct navigation. A
 * patient entitled to the clinic alone could open BA or Lab, and a studio
 * student could open the clinic. The published `bprrehab://` scheme makes that
 * a real vector, not just a devtools trick.
 *
 * This is a navigation guard, not an authorization boundary: the Lab and BA
 * data endpoints still answer any authenticated caller (activity 070). It stops
 * a user from wandering into an area that is not theirs; it does not stop a
 * crafted request.
 *
 * Decides on the last answer the server gave. A failed *refetch* is not a
 * revocation: TanStack keeps `data` while flipping status to error, and with
 * this app's `staleTime: 0` every mount refetches — treating that as "no" would
 * throw an entitled patient out of the clinic every time the network hiccups.
 * With no answer at all, it still refuses.
 */
export default function ModuleGuard({
  module,
  children,
}: {
  module: AppModule["key"];
  children: React.ReactNode;
}) {
  // Same query key as the chooser, so this is a cache read in the common path.
  const { data: modules, isLoading } = useQuery({
    queryKey: ["modules"],
    queryFn: fetchModules,
  });

  if (isLoading) {
    return (
      <Screen>
        <Spinner center />
      </Screen>
    );
  }

  if (!modules?.some((m) => m.key === module)) {
    return <Redirect href="/(app)/module-select" />;
  }

  return <>{children}</>;
}
