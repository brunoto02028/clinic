/**
 * Quais telas do paciente têm equivalente na área da clínica.
 *
 * O middleware mandava **qualquer** `/dashboard/X` para `/admin/X` quando quem
 * clicava era da equipe — a ideia sendo que um link de e-mail do paciente
 * ainda sirva para o terapeuta. A ideia é boa; o mapeamento era cego.
 *
 * Das trinta e sete telas do paciente, **vinte e duas não têm equivalente**.
 * Para essas, o desvio produzia um 404. Foi o que o Bruno viu ao clicar em
 * "Ver Meus Exercícios" no e-mail de aderência e cair em `/admin/treatment`,
 * que nunca existiu (26/09/2026).
 *
 * A lista é conferida por um teste contra o próprio sistema de arquivos: uma
 * tela nova do paciente não pode voltar a virar 404 em silêncio.
 */
export const DASHBOARD_COM_GEMEO_NO_ADMIN: readonly string[] = [
  "achievements",
  "appointments",
  "biohacking",
  "blood-pressure",
  "challenges",
  "clinical-notes",
  "documents",
  "education",
  "exercises",
  "journey",
  "marketplace",
  "nutrition",
  "patients",
  "quizzes",
  "waitlist",
];

/**
 * Para onde mandar alguém da equipe que abriu um link do paciente.
 *
 * `null` significa "não existe equivalente" — e aí o destino honesto é a casa
 * da clínica, nunca uma URL montada a partir do nome da rota. Uma URL montada
 * assim parece certa e responde 404, que é a forma mais cara de errar: quem
 * clica acha que o sistema perdeu a página.
 */
export function gemeoNoAdmin(pathname: string): string | null {
  const m = pathname.match(/^\/dashboard\/([^/]+)/);
  if (!m) return null;
  return DASHBOARD_COM_GEMEO_NO_ADMIN.includes(m[1]) ? `/admin/${m[1]}` : null;
}
