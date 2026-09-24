import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { patientGate } from "@/lib/patient-gate";

export const dynamic = 'force-dynamic';

export async function GET() {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate({ skipConsent: true });
  if (__gate.response) return __gate.response;

  const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = effectiveUser.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      phone: true,
      address: true,
      consentAcceptedAt: true,
    },
  });

  // Check profile completeness (has phone OR address)
  const profileComplete = !!(user?.phone || user?.address);

  // Check screening — only counts when actually submitted (autosave drafts don't count)
  const screening = await prisma.medicalScreening.findUnique({
    where: { userId },
    select: { id: true, isSubmitted: true },
  });
  const screeningComplete = !!screening?.isSubmitted;

  // Check consent
  const consentAccepted = !!user?.consentAcceptedAt;

  // Check if has an active appointment (cancelled/no-show don't count)
  const appointment = await prisma.appointment.findFirst({
    where: { patientId: userId, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
    select: { id: true },
  });
  const hasAppointment = !!appointment;

  return NextResponse.json({
    profileComplete,
    screeningComplete,
    consentAccepted,
    hasAppointment,
  });
}
