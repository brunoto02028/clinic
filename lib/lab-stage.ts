import type { LabOrderStatus, LabRegistrationStatus, LabReviewMode } from "@prisma/client";

/**
 * Onde o pedido está, do ponto de vista de quem espera (081, T-3).
 *
 * O `LabOrderStatus` é o estado do kit; o `LabRegistrationStatus` é o estado
 * do kit **ligado a uma pessoa**; e a liberação é uma decisão da clínica. A
 * tela do paciente não pode mostrar três máquinas de estado — mostra uma, com
 * oito posições, e em só uma delas ele precisa agir.
 */
export type LabStage =
  | "basket"
  | "kit_preparing"
  | "register_kit"
  | "collect_and_post"
  | "at_lab"
  | "in_review"
  | "released"
  | "cancelled";

export interface StageInput {
  status: LabOrderStatus;
  releasedToPatientAt: Date | string | null;
  registrations: { status: LabRegistrationStatus }[];
  /**
   * Não é mais consultado para decidir estágio (26/09/2026): o resultado sai
   * direto para a pessoa, sempre. Permanece no tipo porque a coluna permanece
   * no banco — apagá-la seria perder o que já foi gravado.
   */
  reviewMode?: LabReviewMode;
}

export function labStage(o: StageInput): LabStage {
  if (o.status === "CANCELLED_LAB") return "cancelled";
  if (o.releasedToPatientAt) return "released";
  switch (o.status) {
    case "BASKET":
      return "basket";
    case "CONFIRMED":
      return "kit_preparing";
    case "KIT_DISPATCHED": {
      // O único momento em que o paciente precisa fazer algo: sem associar o
      // kit a si mesmo, a amostra chega ao laboratório sem dono.
      const semDono = o.registrations.length === 0 || o.registrations.some((r) => r.status === "AWAITING_PATIENT");
      return semDono ? "register_kit" : "collect_and_post";
    }
    case "SAMPLE_RECEIVED":
    case "PROCESSING_LAB":
      return "at_lab";
    case "RESULTS_READY":
      /**
       * O resultado chegou, então ele é da pessoa. Ponto.
       *
       * Havia aqui um `in_review` para quem tinha relação clínica — a clínica
       * lia primeiro e liberava. Deixou de existir em 26/09/2026: o exame é um
       * produto que qualquer pessoa compra, e os termos publicados dizem que
       * ninguém da clínica lê antes. `in_review` continua no tipo `LabStage`
       * porque pedidos antigos podem tê-lo gravado, mas nada novo chega lá.
       */
      return "released";
  }
}

/** Em qual estágio o paciente precisa agir. */
export function stageNeedsPatient(stage: LabStage): boolean {
  return stage === "register_kit" || stage === "collect_and_post";
}

/**
 * O texto de cada posição, inglês primeiro. `reviewDays` entra no
 * "em revisão": sem prazo escrito, a espera fica aberta e vira mensagem.
 */
export function stageCopy(stage: LabStage, reviewDays: number): { en: { title: string; body: string }; pt: { title: string; body: string } } {
  const d = reviewDays;
  const C = {
    basket: {
      en: { title: "Not paid yet", body: "This order was started but not paid. Nothing has been sent." },
      pt: { title: "Ainda não pago", body: "Este pedido foi iniciado mas não pago. Nada foi enviado." },
    },
    kit_preparing: {
      en: { title: "Paid — kit being prepared", body: "The laboratory is preparing your kit. It goes out by post; we will tell you when it is on its way." },
      pt: { title: "Pago — kit em preparo", body: "O laboratório está preparando o seu kit. Ele vai pelo correio; avisamos quando estiver a caminho." },
    },
    register_kit: {
      en: { title: "Register your kit", body: "Your kit is on its way. When it arrives, register it here before collecting — a sample without a name cannot be tested." },
      pt: { title: "Registre o seu kit", body: "Seu kit está a caminho. Quando chegar, registre-o aqui antes de coletar — uma amostra sem nome não pode ser analisada." },
    },
    collect_and_post: {
      en: { title: "Collect and post", body: "Kit registered. Collect your sample following the steps below and post it back the same day." },
      pt: { title: "Colete e poste", body: "Kit registrado. Colete a amostra seguindo os passos abaixo e poste no mesmo dia." },
    },
    at_lab: {
      en: { title: "At the laboratory", body: "Your sample arrived and is being analysed. Nothing to do." },
      pt: { title: "No laboratório", body: "Sua amostra chegou e está sendo analisada. Nada a fazer." },
    },
    in_review: {
      en: { title: "Being reviewed by your therapist", body: `Your result has arrived and is with your therapist. It usually takes up to ${d} working day${d === 1 ? "" : "s"}. You will be told when it is ready to see.` },
      pt: { title: "Em revisão com o seu terapeuta", body: `Seu resultado chegou e está com o seu terapeuta. Normalmente leva até ${d} dia${d === 1 ? " útil" : "s úteis"}. Você será avisado quando estiver pronto para ver.` },
    },
    released: {
      // Sem "seu terapeuta revisou": num pedido direto ninguém revisou, e essa
      // é exatamente a frase que dá confiança ao número. A nota do terapeuta,
      // quando existe, a própria tela do resultado mostra.
      en: { title: "Result ready", body: "Your result is in your record." },
      pt: { title: "Resultado pronto", body: "Seu resultado está no seu prontuário." },
    },
    cancelled: {
      en: { title: "Cancelled", body: "This order was cancelled. Contact the clinic if you believe this is a mistake." },
      pt: { title: "Cancelado", body: "Este pedido foi cancelado. Fale com a clínica se achar que é um engano." },
    },
  } as const;
  return C[stage];
}

/** A ordem dos estágios, para a linha do tempo da tela. */
export const STAGE_ORDER: LabStage[] = ["kit_preparing", "register_kit", "collect_and_post", "at_lab", "in_review", "released"];
