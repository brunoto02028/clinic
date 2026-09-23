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
  { title: { en: "Treatment plan", pt: "Plano de tratamento" }, icon: "heart-outline", href: "/(app)/(clinica)/treatment-protocol" },
  { title: { en: "Pending actions", pt: "Pendências" }, icon: "notifications-outline", href: "/(app)/(clinica)/tasks" },
  { title: { en: "Assessment screening", pt: "Avaliação" }, icon: "shield-outline", href: "/(app)/(clinica)/screening" },
  { title: { en: "My progress", pt: "Meu progresso" }, icon: "trending-up-outline", href: "/(app)/(clinica)/assessment-progress" },
  { title: { en: "Outcome measures", pt: "Medidas de evolução" }, icon: "stats-chart-outline", href: "/(app)/(clinica)/outcome-measures" },
  { title: { en: "Daily check-in", pt: "Check-in diário" }, icon: "calendar-number-outline", href: "/(app)/(clinica)/daily-checkin" },
  { title: { en: "Education", pt: "Conteúdo" }, icon: "school-outline", href: "/(app)/(clinica)/education" },
  // Wearables held its place back because /api/wearables was not on the
  // middleware's mobile prefix list, so every request was redirected to the web
  // login and the screen could never show a connection. That line is in now, so
  // the entry comes with it.
  { title: { en: "Devices", pt: "Dispositivos" }, icon: "watch-outline", href: "/(app)/(clinica)/wearables" },
  // Quizzes is deliberately absent: the list screen exists but its cards have
  // no onPress and there is no detail screen, so the entry led to a list where
  // nothing opens. It returns with the quiz screen (T-4 family).
  { title: { en: "How it works", pt: "Como funciona" }, icon: "book-outline", href: "/(app)/(clinica)/guide" },
  { title: { en: "Terms & consent", pt: "Termos & consentimento" }, icon: "shield-checkmark-outline", href: "/(app)/(clinica)/consent" },
];

export default function Profile() {
  return <ModuleProfile sections={CLINIC_SECTIONS} />;
}
