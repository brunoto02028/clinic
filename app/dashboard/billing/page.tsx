import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { isPersonalTenant } from "@/lib/tenant-type";
import StudentBilling from "@/components/billing/student-billing";

export const metadata: Metadata = {
  title: "Payments",
  robots: { index: false, follow: false },
};

// Billing is a personal-trainer feature. A clinical patient who reaches this URL
// directly is sent back to their dashboard (the sidebar already hides it). Only
// redirect on a known non-personal tenant so an older token falls through.
export default async function BillingPage() {
  const session = await getServerSession(authOptions);
  const clinicType = (session?.user as any)?.clinicType;
  if (clinicType && !isPersonalTenant(clinicType)) redirect("/dashboard");
  return <StudentBilling />;
}
