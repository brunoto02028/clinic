import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import PatientDashboard from "@/components/dashboard/patient-dashboard";
import TherapistDashboard from "@/components/dashboard/therapist-dashboard";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role || "PATIENT";
  const isTherapist = userRole === "ADMIN" || userRole === "THERAPIST";

  return isTherapist ? <TherapistDashboard /> : <PatientDashboard />;
}
