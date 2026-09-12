import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { isPersonalTenant } from "@/lib/tenant-type";
import ProgramsList from "@/components/programs/programs-list";

// Program Templates (activity 33) is a personal-trainer feature. Defence-in-
// depth on top of the API gate: a clinic tenant is sent back to /admin.
export default async function AdminTrainingProgramsPage() {
  const session = await getServerSession(authOptions);
  const clinicType = (session?.user as any)?.clinicType;
  if (clinicType && !isPersonalTenant(clinicType)) redirect("/admin");
  return <ProgramsList />;
}
