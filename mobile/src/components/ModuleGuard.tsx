import { Redirect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, Spinner } from "@/components/ui";
import { fetchModules, type AppModule } from "@/api/modules";
import { SHOW_LAB } from "@/lib/feature-flags";

/**
 * Route guard for a module's route group.
 *
 * `/api/mobile/modules` decides which modules a user may reach, but its answer
 * only ever fed the chooser's list — nothing stopped a direct navigation. A
 * patient entitled to the clinic alone could open BA, and a studio student
 * could open the clinic. The published `bprrehab://` scheme makes that a real
 * vector, not just a devtools trick.
 *
 * The lab is the one deliberate exception: it is offered by the build rather
 * than by the server while its own API is being finished — and only to someone
 * the server already treats as a clinic patient. See lib/feature-flags.ts.
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

  // The lab is offered by the build, not only by the server — same rule as the
  // chooser, so a card that appears there is a card that opens. Still only for
  // someone the server treats as a clinic patient. See lib/feature-flags.ts.
  const granted =
    modules?.some((m) => m.key === module) ||
    (module === "lab" && SHOW_LAB && !!modules?.some((m) => m.key === "clinica"));

  if (!granted) {
    return <Redirect href="/(app)/module-select" />;
  }

  return <>{children}</>;
}
