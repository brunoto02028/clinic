// Retired (activity 43) — "My Exercises" is now part of the unified
// Treatment Plan page (protocol items + standalone prescriptions in one
// place, with a daily "Today" card). This route stays as a redirect so
// links already sent to patients (WhatsApp, reminder e-mails) keep working.
import { redirect } from "next/navigation";

export default function ExercisesRedirect() {
  redirect("/dashboard/treatment");
}
