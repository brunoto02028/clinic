import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { isPersonalTenant } from "@/lib/tenant-type";
import StudentNutrition from "@/components/nutrition/student-nutrition";

export const metadata: Metadata = {
  title: "Nutrition",
  robots: { index: false, follow: false },
};

// Nutrition is a personal-trainer feature. A clinical patient who reaches this
// URL directly is sent back to their dashboard (the sidebar already hides it).
// We only redirect when the tenant type is known and non-personal — an older
// token without clinicType falls through and the API gate handles access, so a
// legitimate personal student is never kicked out.
export default async function NutritionPage() {
  const session = await getServerSession(authOptions);
  const clinicType = (session?.user as any)?.clinicType;
  if (clinicType && !isPersonalTenant(clinicType)) redirect("/dashboard");
  return <StudentNutrition />;
}
