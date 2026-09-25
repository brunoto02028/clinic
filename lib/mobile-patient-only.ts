/**
 * O app é do paciente. Só.
 *
 * Nada impedia uma conta da clínica de entrar nele, e o que acontecia depois
 * era um beco: a lista de módulos aparecia, cada tela recusava com 403 porque
 * as rotas de dado exigem paciente, e não havia como sair. Aconteceu de
 * verdade em 24/09/2026, com a conta do próprio Bruno.
 *
 * A decisão dele, e é a certa: qualquer conta que não seja de paciente é
 * recusada na porta — mesmo que a pessoa recupere a senha, mesmo que ela seja
 * dona da clínica. A área do profissional é a web, e não existe versão dela
 * aqui para oferecer.
 *
 * Aluno de estúdio **é** paciente (`role: PATIENT` num tenant
 * `PERSONAL_TRAINER`) e continua entrando normalmente — o que ele vê é treino,
 * avaliações e nutrição, que é o app dele. Quem é recusado é o profissional.
 *
 * Um e-mail é uma conta só, com um papel só. Se um dia a mesma pessoa precisar
 * das duas coisas, precisa de duas contas — e aí a de paciente entra aqui e vê
 * a área do paciente, que é exatamente o que se quer.
 */

export const PATIENT_ONLY_MESSAGE = {
  en: "The BPR app is for patients. This is a clinic account — please use bpr.clinic in your browser.",
  pt: "O app da BPR é para pacientes. Esta é uma conta da clínica — use o bpr.clinic no navegador.",
};

/** `true` quando esta conta pode usar o app. */
export function canUsePatientApp(role: string | null | undefined): boolean {
  return role === "PATIENT";
}

/** O corpo da recusa, no formato que o app já sabe ler. */
export function patientOnlyRefusal() {
  return {
    error: PATIENT_ONLY_MESSAGE.en,
    errorPt: PATIENT_ONLY_MESSAGE.pt,
    code: "patient_app_only" as const,
  };
}
