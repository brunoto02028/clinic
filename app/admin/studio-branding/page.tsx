import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import StudioBrandingForm from "@/components/admin/studio-branding-form";

// The tenant owner's own branding (activity 52, T-3). A therapist doesn't set
// the brand; the API enforces the same rule.
export default async function StudioBrandingPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") redirect("/admin");
  return <StudioBrandingForm />;
}
