import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth-options";
import PatientDashboard from "@/components/dashboard/patient-dashboard";
import TherapistDashboard from "@/components/dashboard/therapist-dashboard";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role || "PATIENT";
  const isTherapist = userRole === "ADMIN" || userRole === "THERAPIST";
  // "View as Patient/Student": the session is still the admin's, so the
  // impersonation cookie decides — they must see the patient's home, not the
  // therapist dashboard (activity 55, T-7). The data comes from the patient
  // APIs, which the middleware already serves as the impersonated patient.
  const impersonating =
    !!cookies().get("impersonate-patient-id")?.value && (userRole === "ADMIN" || userRole === "SUPERADMIN");

  return isTherapist && !impersonating ? <TherapistDashboard /> : <PatientDashboard />;
}
