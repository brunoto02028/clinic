import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import SignupForm from "@/components/auth/signup-form";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default async function SignupPage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background bg-grid-pattern flex flex-col">
      <SiteHeader currentPage="other" />
      <main className="flex-1 flex items-center justify-center p-4 py-8">
        <SignupForm />
      </main>
      <SiteFooter />
    </div>
  );
}
