import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getSuperadminActor } from "@/lib/tenant-access";
import { sendEmail } from "@/lib/email";
import { getBprEmailLogoUrl } from "@/lib/email-templates";
import { studioWelcomeEmail, MASKED_PASSWORD } from "@/lib/studio-welcome-email";

export const dynamic = "force-dynamic";

// Same alphabet and shape as the "Add Clinic / Studio" flow (app/admin/clinics).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const tempPassword = () => "St-" + Array.from(crypto.randomBytes(14), (b) => ALPHABET[b % ALPHABET.length]).join("");

// The studio and its owner (first active ADMIN), or the error response.
async function studioAndOwner(id: string) {
  const studio = await prisma.clinic.findUnique({
    where: { id },
    select: { name: true, slug: true, type: true, isActive: true, primaryColor: true },
  });
  if (!studio) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (studio.type !== "PERSONAL_TRAINER" || !studio.isActive) {
    return { error: NextResponse.json({ error: "Only an active personal-trainer studio has a studio welcome e-mail" }, { status: 400 }) };
  }
  const owner = await prisma.user.findFirst({
    where: { clinicId: id, role: "ADMIN", isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, firstName: true, password: true },
  });
  if (!owner) return { error: NextResponse.json({ error: "This studio has no active owner" }, { status: 404 }) };
  return { studio, owner };
}

async function buildMail(
  studio: { name: string; slug: string; primaryColor: string | null },
  owner: { email: string; firstName: string | null },
  password: string,
  isPt: boolean
) {
  return studioWelcomeEmail({
    studioName: studio.name,
    slug: studio.slug,
    firstName: owner.firstName || "",
    email: owner.email,
    tempPassword: password,
    isPt,
    appUrl: process.env.NEXTAUTH_URL || "https://bpr.clinic",
    primaryColor: studio.primaryColor,
    logoUrl: await getBprEmailLogoUrl(),
  });
}

// Preview — exactly what POST would send, with the password masked. Nothing
// is sent and nothing changes (the send button only comes after this).
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const superadmin = await getSuperadminActor(request);
  if (!superadmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const found = await studioAndOwner(params.id);
  if ("error" in found) return found.error;
  const isPt = request.nextUrl.searchParams.get("locale") === "pt";
  const mail = await buildMail(found.studio, found.owner, MASKED_PASSWORD, isPt);
  return NextResponse.json({ to: found.owner.email, from: mail.from, subject: mail.subject, html: mail.html });
}

// Sends a studio's owner the studio welcome e-mail with a fresh temporary
// password (activity 56) — for studios created without it, or an owner who lost
// it. SUPERADMIN only, one manual click after the preview; the new password
// only sticks once the e-mail was accepted for delivery.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const superadmin = await getSuperadminActor(request);
  if (!superadmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const isPt = body?.locale === "pt";

  const found = await studioAndOwner(params.id);
  if ("error" in found) return found.error;
  const { studio, owner } = found;

  const password = tempPassword();
  const newHash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: owner.id }, data: { password: newHash } });

  const mail = await buildMail(studio, owner, password, isPt);
  const sent = await sendEmail({ to: owner.email, subject: mail.subject, html: mail.html, from: mail.from });
  if (!sent.success) {
    // The owner never got the new password — keep the one they have. Only if
    // it is still ours: a concurrent send may already have mailed a newer one.
    await prisma.user.updateMany({ where: { id: owner.id, password: newHash }, data: { password: owner.password } });
    console.error("Studio welcome email not accepted:", sent.error);
    return NextResponse.json({ error: "The e-mail could not be sent; the owner's password was not changed" }, { status: 502 });
  }

  return NextResponse.json({ sent: true, to: owner.email });
}
