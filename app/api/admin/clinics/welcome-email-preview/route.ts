import { NextRequest, NextResponse } from "next/server";
import { getSuperadminActor } from "@/lib/tenant-access";
import { getBprEmailLogoUrl } from "@/lib/email-templates";
import { studioWelcomeEmail, MASKED_PASSWORD } from "@/lib/studio-welcome-email";

export const dynamic = "force-dynamic";

// Preview of the welcome e-mail "Add Clinic / Studio" is about to send, for a
// studio that doesn't exist yet (activity 56) — shown before anything is
// created or sent. SUPERADMIN only; the password is masked.
export async function POST(request: NextRequest) {
  const superadmin = await getSuperadminActor(request);
  if (!superadmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const studioName = str(body?.studioName);
  const email = str(body?.email);
  if (!studioName || !email || !str(body?.firstName)) {
    return NextResponse.json({ error: "Studio name, owner first name and e-mail are required" }, { status: 400 });
  }

  const mail = studioWelcomeEmail({
    studioName,
    slug: str(body?.slug),
    firstName: str(body?.firstName),
    email,
    tempPassword: MASKED_PASSWORD,
    isPt: body?.locale === "pt",
    appUrl: process.env.NEXTAUTH_URL || "https://bpr.clinic",
    logoUrl: await getBprEmailLogoUrl(),
  });
  return NextResponse.json({ to: email, from: mail.from, subject: mail.subject, html: mail.html });
}
