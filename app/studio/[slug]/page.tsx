import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import StudioLoginForm from "@/components/auth/studio-login-form";
import type { Metadata } from "next";

// Branded login for a personal-trainer studio: /studio/[slug]. The trainer and
// their students sign in here. Utility page — keep it out of the index.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default async function StudioLoginPage({ params }: { params: { slug: string } }) {
  // Resolve the tenant by slug, branding included. Studio pages are personal-only:
  // a clinic slug (or unknown/inactive) is a 404 — clinics keep the generic entry.
  const clinic = await prisma.clinic.findFirst({
    where: { slug: params.slug, isActive: true, type: "PERSONAL_TRAINER" },
    select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true },
  });
  if (!clinic) notFound();

  const session = await getServerSession(authOptions);
  if (session?.user) {
    const role = (session.user as any).role;
    redirect(role === "PATIENT" ? "/dashboard" : "/admin");
  }

  return (
    <StudioLoginForm
      slug={clinic.slug}
      clinicId={clinic.id}
      studioName={clinic.name}
      logoUrl={clinic.logoUrl}
      primaryColor={clinic.primaryColor}
    />
  );
}
