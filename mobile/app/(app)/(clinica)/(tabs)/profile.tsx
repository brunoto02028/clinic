import { ModuleProfile, type ProfileSection } from "@/components/ModuleProfile";

/**
 * The clinic module has four tabs — Home, Appointments, Exercises, Profile —
 * and nine screens that had no entry point anywhere: they existed as route
 * files and opened only by typed URL. This is where the patient reaches them.
 *
 * Ordering follows the web's curated menu (`lib/patient-sections.ts`): the
 * clinical record first, then what the patient does between sessions, then
 * reference material.
 */
const CLINIC_SECTIONS: ProfileSection[] = [
  { title: { en: "Messages", pt: "Mensagens" }, icon: "chatbubbles-outline", href: "/(app)/(clinica)/messages" },
  { title: { en: "My records", pt: "Meu prontuário" }, icon: "document-text-outline", href: "/(app)/(clinica)/clinical-notes" },
  { title: { en: "My documents", pt: "Meus documentos" }, icon: "folder-outline", href: "/(app)/(clinica)/documents" },
  /**
   * Faturas.
   *
   * A clínica emitia, numerava, gerava o PDF com o logo da BPR e mandava por
   * e-mail depois da aprovação — e o paciente não tinha onde vê-las. Quem
   * apagasse o e-mail perdia a fatura, e o app é o único lugar dele depois do
   * lançamento. Fica ao lado dos documentos porque é o que é: papel da clínica
   * que pertence ao paciente.
   */
  { title: { en: "Invoices", pt: "Faturas" }, icon: "receipt-outline", href: "/(app)/(clinica)/invoices" },
  /**
   * Quem eu cuido (089/091).
   *
   * A tela existia e só era alcançável **de dentro do laboratório** — pelo perfil
   * do lab e pelo checkout do exame. Uma mãe que quer marcar **consulta** para a
   * filha não tinha por onde cadastrá-la: o recurso existia e não tinha porta.
   *
   * O caminho continua o mesmo arquivo, de propósito: duas telas para a mesma
   * lista seriam duas listas em duas semanas.
   */
  { title: { en: "People I look after", pt: "Quem eu cuido" }, icon: "people-outline", href: "/(app)/(lab)/dependents" },
  { title: { en: "Treatment plan", pt: "Plano de tratamento" }, icon: "heart-outline", href: "/(app)/(clinica)/treatment-protocol", module: "mod_treatment" },
  // Os planos que a clínica oferece a este paciente (082, T-3). A API já
  // filtrava por paciente; faltava a porta.
  { title: { en: "Plans", pt: "Planos" }, icon: "pricetags-outline", href: "/(app)/(clinica)/plans", module: "mod_plans" },
  { title: { en: "Pending actions", pt: "Pendências" }, icon: "notifications-outline", href: "/(app)/(clinica)/tasks", module: "mod_tasks" },
  { title: { en: "Assessment screening", pt: "Avaliação" }, icon: "shield-outline", href: "/(app)/(clinica)/screening", module: "mod_screening" },
  { title: { en: "My progress", pt: "Meu progresso" }, icon: "trending-up-outline", href: "/(app)/(clinica)/assessment-progress", module: "mod_screening" },
  { title: { en: "Outcome measures", pt: "Medidas de evolução" }, icon: "stats-chart-outline", href: "/(app)/(clinica)/outcome-measures", module: "mod_records" },
  // Os relatórios de acompanhamento (099 T-5). Ficam ao lado das medidas de
  // evolução porque são a mesma pergunta — como eu estou indo — respondida de
  // outra forma.
  { title: { en: "My reports", pt: "Meus relatórios" }, icon: "document-text-outline", href: "/(app)/(clinica)/reports", module: "mod_records" },
  { title: { en: "Daily check-in", pt: "Check-in diário" }, icon: "calendar-number-outline", href: "/(app)/(clinica)/daily-checkin", module: "mod_journey" },
  // The server, the web and a reminder cron all handled blood pressure; the
  // app had no screen for it, so a patient who uses the phone could not record
  // the one number the clinic wants a daily series of.
  { title: { en: "Blood pressure", pt: "Pressão arterial" }, icon: "pulse-outline", href: "/(app)/(clinica)/blood-pressure" },
  // "Conteúdo" não dizia o que tem lá dentro: o Bruno procurou os artigos
  // no app e não achou esta linha. São os artigos do site virados material
  // clínico (096), e o nome passa a dizer isso.
  { title: { en: "Articles", pt: "Artigos" }, icon: "school-outline", href: "/(app)/(clinica)/education", module: "mod_education" },
  // Wearables held its place back because /api/wearables was not on the
  // middleware's mobile prefix list, so every request was redirected to the web
  // login and the screen could never show a connection. That line is in now, so
  // the entry comes with it.
  { title: { en: "Devices", pt: "Dispositivos" }, icon: "watch-outline", href: "/(app)/(clinica)/wearables", module: "mod_devices" },
  // Quizzes is deliberately absent: the list screen exists but its cards have
  // no onPress and there is no detail screen, so the entry led to a list where
  // nothing opens. It returns with the quiz screen (T-4 family).
  { title: { en: "How it works", pt: "Como funciona" }, icon: "book-outline", href: "/(app)/(clinica)/guide", module: "mod_guide" },
  { title: { en: "Terms & consent", pt: "Termos & consentimento" }, icon: "shield-checkmark-outline", href: "/(app)/(clinica)/consent" },
];

export default function Profile() {
  return <ModuleProfile sections={CLINIC_SECTIONS} />;
}
