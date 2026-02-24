import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import PreviewClientLayout from "./preview-client-layout";

export default async function PatientPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Only admin/therapist can access the patient preview
  const userRole = (session.user as { role?: string })?.role;
  if (userRole !== "ADMIN" && userRole !== "SUPERADMIN" && userRole !== "THERAPIST") {
    redirect("/dashboard");
  }

  return <PreviewClientLayout>{children}</PreviewClientLayout>;
}
