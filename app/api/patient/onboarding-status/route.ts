import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";

export async function GET() {
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

  // Check screening
  const screening = await prisma.medicalScreening.findUnique({
    where: { userId },
    select: { id: true },
  });
  const screeningComplete = !!screening;

  // Check consent
  const consentAccepted = !!user?.consentAcceptedAt;

  // Check if has any appointment
  const appointment = await prisma.appointment.findFirst({
    where: { patientId: userId },
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
