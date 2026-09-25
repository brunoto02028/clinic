/**
 * Quem pode escrever numa rota que só o paciente possui.
 *
 * O `patientGate` deixa passar quem não é paciente **de propósito**: rotas que
 * o admin e o portal dividem — a triagem, por exemplo — quebrariam se ele
 * recusasse, porque a autorização da equipe é outra e já rodou antes.
 *
 * Só que há rotas que ninguém divide, e a foto de perfil do paciente é uma.
 * Nelas, herdar a passagem livre é errado. O QA de 24/09/2026 pegou o caso:
 * uma conta de terapeuta gravava foto por uma rota `/api/patient/`. Não era
 * vazamento entre contas — cada um escreve na própria linha —, mas era a rota
 * aceitando quem ela não serve.
 *
 * Fica num arquivo **sem imports** de propósito: `patient-gate.ts` arrasta
 * prisma e next-auth, e um teste que os carrega trava. A decisão é o que pode
 * regredir; o encanamento o TypeScript garante.
 */
export function patientOnlyWriteRefusal(
  gate: { role?: string | null; isImpersonating?: boolean } | null | undefined
): "impersonation" | "not_patient" | null {
  // A impersonação vem primeiro: um admin vendo o portal carrega o papel do
  // paciente e passaria pela checagem seguinte sem isto.
  if (gate?.isImpersonating) return "impersonation";
  if (gate?.role !== "PATIENT") return "not_patient";
  return null;
}
