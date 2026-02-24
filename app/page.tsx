import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import LandingPage from "@/components/landing-page";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    const userRole = (session.user as any)?.role;
    if (userRole === "ADMIN" || userRole === "THERAPIST" || userRole === "SUPERADMIN") {
      redirect("/admin");
    } else {
      redirect("/dashboard");
    }
  }

  return <LandingPage />;
}
