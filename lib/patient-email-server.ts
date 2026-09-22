// Access guard shared by the "Email to patient" routes (activity 68).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { isPersonalTenant } from "@/lib/tenant-type";

export type EmailPatient = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  preferredLocale: string | null;
  clinicId: string;
  address: string | null;
};

type Guarded =
  | { response: NextResponse; patient?: never; actorId?: never }
  | { response?: never; patient: EmailPatient; actorId: string };

/** Staff of the patient's tenant only, never for a personal studio; returns the patient. */
export async function guardEmailAccess(request: NextRequest, patientId: string): Promise<Guarded> {
  const access = await staffPatientAccess(request, patientId);
  if (access.response) return { response: access.response };

  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    select: { id: true, firstName: true, lastName: true, email: true, preferredLocale: true, clinicId: true, address: true },
  });
  if (!patient?.clinicId) return { response: NextResponse.json({ error: "Patient not found" }, { status: 404 }) };

  const clinic = await prisma.clinic.findUnique({ where: { id: patient.clinicId }, select: { type: true } });
  if (isPersonalTenant(clinic?.type)) {
    return { response: NextResponse.json({ error: "Not available for studio accounts" }, { status: 403 }) };
  }
  return { patient: patient as EmailPatient, actorId: access.actor.userId };
}
