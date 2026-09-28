import type { LabStage } from "@/api/labs";
import type { Lang } from "@/lib/i18n";

/**
 * O texto de cada posição do pedido (081, T-3).
 *
 * Escrito igual ao `stageCopy` de `lib/lab-stage.ts` no servidor — o app não
 * compartilha código com a web, então é cópia de propósito. Inglês primeiro.
 */
export function stageCopy(stage: LabStage, lang: Lang, reviewDays: number): { title: string; body: string } {
  const d = reviewDays;
  const C: Record<LabStage, { en: { title: string; body: string }; pt: { title: string; body: string } }> = {
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
      // é a frase que dá confiança ao número. A nota, quando existe, a tela do
      // resultado mostra.
      en: { title: "Result ready", body: "Your result is in your record." },
      pt: { title: "Resultado pronto", body: "Seu resultado está no seu prontuário." },
    },
    cancelled: {
      en: { title: "Cancelled", body: "This order was cancelled. Contact the clinic if you believe this is a mistake." },
      pt: { title: "Cancelado", body: "Este pedido foi cancelado. Fale com a clínica se achar que é um engano." },
    },
  };
  return C[stage][lang];
}

/** A ordem da linha do tempo. */
export const STAGE_ORDER: LabStage[] = ["kit_preparing", "register_kit", "collect_and_post", "at_lab", "in_review", "released"];

/** Os passos da picada no dedo. Coleta ruim é amostra rejeitada. */
export const COLLECTION_STEPS: { en: string; pt: string }[] = [
  { en: "Drink a glass of water and warm your hands under warm water for a minute.", pt: "Beba um copo de água e aqueça as mãos em água morna por um minuto." },
  { en: "Let your arm hang down and gently shake it — blood flows better to the fingertips.", pt: "Deixe o braço pendurado e balance-o de leve — o sangue chega melhor às pontas dos dedos." },
  { en: "Prick the side of your ring or middle finger, not the tip. Wipe away the first drop.", pt: "Fure a lateral do dedo anelar ou médio, não a ponta. Limpe a primeira gota." },
  { en: "Fill the tube to the line. Do not squeeze the finger — squeezing dilutes the sample.", pt: "Encha o tubo até a linha. Não esprema o dedo — espremer dilui a amostra." },
  { en: "Post it back the same day, before the last collection.", pt: "Poste no mesmo dia, antes da última coleta do correio." },
];
