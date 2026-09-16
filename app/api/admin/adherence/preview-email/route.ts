import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { sessionClinicId, NO_CLINIC } from "@/lib/session-clinic";
import { getClinicDailyAdherence } from "@/lib/clinic-daily-adherence";
import { buildDailyAdherenceEmail } from "@/lib/daily-adherence-email";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["SUPERADMIN", "ADMIN", "THERAPIST"];

// GET — renders the exact HTML the daily-adherence cron would e-mail, for
// the Active Clinic, without sending anything or touching dedupe. Gated by
// the admin session (not the cron secret) so it can be opened straight in a
// browser while iterating on the template.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clinicId = await sessionClinicId(session);
  if (!clinicId) return NextResponse.json(NO_CLINIC, { status: 403 });

  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { id: true, name: true } });
  if (!clinic) return NextResponse.json({ error: "Clinic not found" }, { status: 404 });

  const now = new Date();
  const { completed, missing } = await getClinicDailyAdherence(clinic.id, now);
  const html = await buildDailyAdherenceEmail(clinic.name, clinic.id, completed, missing, now);
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
