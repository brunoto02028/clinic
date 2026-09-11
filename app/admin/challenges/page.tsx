import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { isPersonalTenant } from "@/lib/tenant-type";
import ChallengesAdmin from "@/components/challenges/challenges-admin";

// Challenges is a personal-trainer feature. Defence-in-depth on top of the API
// gate: a clinic tenant (even with TRAINING on) is sent back to /admin.
export default async function AdminChallengesPage() {
  const session = await getServerSession(authOptions);
  const clinicType = (session?.user as any)?.clinicType;
  if (clinicType && !isPersonalTenant(clinicType)) redirect("/admin");
  return <ChallengesAdmin />;
}
