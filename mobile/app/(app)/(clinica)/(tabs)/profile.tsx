import { ModuleProfile, type ProfileSection } from "@/components/ModuleProfile";

/**
 * The clinic module has four tabs — Home, Sessions, Exercises, Profile — and
 * nine screens that had no entry point anywhere: they existed as route files
 * and opened only by typed URL. This is where the patient reaches them.
 *
 * Ordering follows the web's curated menu (`lib/patient-sections.ts`): the
 * clinical record first, then what the patient does between sessions, then
 * reference material.
 */
const CLINIC_SECTIONS: ProfileSection[] = [
  { title: "My records", icon: "document-text-outline", href: "/(app)/(clinica)/clinical-notes" },
  { title: "My documents", icon: "folder-outline", href: "/(app)/(clinica)/documents" },
  { title: "Treatment plan", icon: "heart-outline", href: "/(app)/(clinica)/treatment-protocol" },
  { title: "Pending actions", icon: "notifications-outline", href: "/(app)/(clinica)/tasks" },
  { title: "Assessment screening", icon: "shield-outline", href: "/(app)/(clinica)/screening" },
  { title: "My progress", icon: "trending-up-outline", href: "/(app)/(clinica)/assessment-progress" },
  { title: "Outcome measures", icon: "stats-chart-outline", href: "/(app)/(clinica)/outcome-measures" },
  { title: "Education", icon: "school-outline", href: "/(app)/(clinica)/education" },
  // Quizzes is deliberately absent: the list screen exists but its cards have
  // no onPress and there is no detail screen, so the entry led to a list where
  // nothing opens. It returns with the quiz screen (T-4 family).
  { title: "Wearables", icon: "watch-outline", href: "/(app)/(clinica)/wearables" },
  { title: "How it works", icon: "book-outline", href: "/(app)/(clinica)/guide" },
  { title: "Terms & consent", icon: "shield-checkmark-outline", href: "/(app)/(clinica)/consent" },
];

export default function Profile() {
  return <ModuleProfile sections={CLINIC_SECTIONS} />;
}
