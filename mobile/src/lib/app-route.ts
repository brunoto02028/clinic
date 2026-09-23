/**
 * The app's route for a link written for the web.
 *
 * `/api/patient/notifications` answers both surfaces and speaks the web's
 * paths — every notification carried `/dashboard/…`. The app pushed that
 * string straight into the router, and expo-router, having no such route,
 * showed the developer's "Unmatched Route" screen. Every notification in the
 * app led there.
 *
 * Returning `null` for an unknown path is deliberate: the caller does nothing
 * rather than navigate somewhere invented. A link that goes nowhere is better
 * than a link that lands a patient on a stack trace.
 */
const WEB_TO_APP: Record<string, string> = {
  "/dashboard": "/(app)/(clinica)/(tabs)",
  "/dashboard/appointments": "/(app)/(clinica)/(tabs)/appointments",
  "/dashboard/treatment": "/(app)/(clinica)/treatment-protocol",
  "/dashboard/exercises": "/(app)/(clinica)/(tabs)/exercises",
  "/dashboard/screening": "/(app)/(clinica)/screening",
  "/dashboard/profile": "/(app)/(clinica)/(tabs)/profile",
  "/dashboard/tasks": "/(app)/(clinica)/tasks",
  "/dashboard/records": "/(app)/(clinica)/clinical-notes",
  "/dashboard/clinical-notes": "/(app)/(clinica)/clinical-notes",
  "/dashboard/documents": "/(app)/(clinica)/documents",
  "/dashboard/education": "/(app)/(clinica)/education",
  "/dashboard/guide": "/(app)/(clinica)/guide",
  "/dashboard/consent": "/(app)/(clinica)/consent",
  "/dashboard/quizzes": "/(app)/(clinica)/quizzes",
  "/dashboard/outcome-measures": "/(app)/(clinica)/outcome-measures",
  "/dashboard/assessment-flow": "/(app)/(clinica)/assessment-progress",
  // The web keeps the daily check-in and the wearables on one page; the app
  // splits them, and the check-in is what these notifications are about.
  "/dashboard/biohacking": "/(app)/(clinica)/daily-checkin",
  "/dashboard/journey": "/(app)/(clinica)/daily-checkin",
};

export function appRouteFor(link: string | null | undefined): string | null {
  if (!link) return null;
  // Already an app route.
  if (link.startsWith("/(app)")) return link;
  const path = link.split("?")[0].replace(/\/+$/, "") || "/dashboard";
  return WEB_TO_APP[path] ?? null;
}
