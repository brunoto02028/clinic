import { View } from "react-native";
import { Redirect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Spinner } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";
import { fetchModules, type AppModule } from "@/api/modules";
import { SHOW_LAB } from "@/lib/feature-flags";

/**
 * Route guard for a module's route group.
 *
 * `/api/mobile/modules` decides which modules a user may reach, but its answer
 * only ever fed the chooser's list — nothing stopped a direct navigation. A
 * patient entitled to the clinic alone could open BA, and a studio student
 * could open the clinic. The published `bprclinic://` scheme makes that a real
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
 *
 * **O spinner é uma cortina, não uma troca de tela.** Este componente embrulha
 * o `<Stack>` do módulo inteiro. Trocar os filhos por um spinner desmontava o
 * navegador — e um `<Stack>` remontado nasce com **histórico vazio**, ou seja,
 * o botão de voltar perde para onde ir. Qualquer momento em que esta consulta
 * volte a carregar (cache limpo no login, sessão renovada, rede oscilando)
 * destruía a pilha de navegação do paciente. Achado em 24/09/2026, investigando
 * por que o voltar não voltava.
 */
export default function ModuleGuard({
  module,
  children,
}: {
  module: AppModule["key"];
  children: React.ReactNode;
}) {
  const t = useTheme();

  // Same query key as the chooser, so this is a cache read in the common path.
  const { data: modules, isLoading } = useQuery({
    queryKey: ["modules"],
    queryFn: fetchModules,
  });

  // The lab is offered by the build, not only by the server — same rule as the
  // chooser, so a card that appears there is a card that opens. Still only for
  // someone the server treats as a clinic patient. See lib/feature-flags.ts.
  const granted =
    modules?.some((m) => m.key === module) ||
    (module === "lab" && SHOW_LAB && !!modules?.some((m) => m.key === "clinica"));

  // Só esta saída desmonta os filhos, e ela é terminal: o paciente está saindo
  // do módulo de qualquer forma.
  if (!isLoading && !granted) {
    return <Redirect href="/(app)/module-select" />;
  }

  return (
    <View style={{ flex: 1 }}>
      {children}
      {isLoading && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: t.colors.background,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Spinner />
        </View>
      )}
    </View>
  );
}
