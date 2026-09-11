import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { isPersonalTenant } from "@/lib/tenant-type";
import StudentChallenges from "@/components/challenges/student-challenges";

export const metadata: Metadata = {
  title: "Challenges",
  robots: { index: false, follow: false },
};

// Challenges is a personal-trainer feature. A clinical patient who reaches this
// URL directly is sent back to their dashboard (the sidebar already hides it).
export default async function ChallengesPage() {
  const session = await getServerSession(authOptions);
  const clinicType = (session?.user as any)?.clinicType;
  if (clinicType && !isPersonalTenant(clinicType)) redirect("/dashboard");
  return <StudentChallenges />;
}
