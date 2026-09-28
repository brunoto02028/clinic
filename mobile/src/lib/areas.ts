import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchModules } from "@/api/modules";
import { useModule } from "@/store/module";

/**
 * Sair da área em que se está, para outra que a conta tem.
 *
 * O laboratório foi ligado em produção, o servidor passou a devolvê-lo em
 * `/api/mobile/modules` — e ele não aparecia em lugar nenhum no build 15.
 * Não era o interruptor: era que **não havia porta**. Este build é
 * `CLINIC_ONLY`, então o seletor de áreas se desviava sozinho para a clínica,
 * e o botão que abria o seletor estava escondido pela mesma bandeira. O módulo
 * era concedido e inalcançável ao mesmo tempo (medido em 26/09/2026).
 *
 * `CLINIC_ONLY` decide **onde a pessoa cai**, não onde ela pode ir. O seletor
 * volta a ser alcançável com `?pick=1`, que desliga o desvio só naquela visita.
 *
 * `canSwitch` é falso com uma área só: um botão que leva a uma escolha de um
 * item é um botão que não faz nada.
 */
export function useAreaSwitch() {
  const clearModule = useModule((s) => s.clearModule);
  const { data: modules } = useQuery({ queryKey: ["modules"], queryFn: fetchModules });

  return {
    canSwitch: (modules?.length ?? 0) > 1,
    areaCount: modules?.length ?? 0,
    switchArea: () => {
      clearModule();
      router.replace("/module-select?pick=1");
    },
  };
}
