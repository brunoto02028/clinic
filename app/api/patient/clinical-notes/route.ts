import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { assertModuleAccess } from "@/lib/module-access";
import { accessErrorResponse, AccessError } from "@/lib/tenant-access";

export const dynamic = "force-dynamic";

/**
 * GET — the patient's own session notes.
 *
 * The mobile app has been calling this path since the clinical-notes screen
 * shipped, and it did not exist: every request 404'd, and the client swallowed
 * it with `catch { return [] }`, so a patient with real notes was shown an
 * empty state indistinguishable from having none. The web reads the same data
 * through `/api/soap-notes`, which is not on the mobile prefix allowlist.
 *
 * Scoped by clinic as well as patient, like `/api/patient/protocol`: filtering
 * on patientId alone would surface a stray note from another tenant on this
 * patient's own screen.
 */
export async function GET(_req: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = effectiveUser.userId;
    if (effectiveUser.role === "PATIENT") {
      await assertModuleAccess(userId, "mod_clinical_notes");
    }

    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { clinicId: true },
    });

    const notes = me?.clinicId
      ? await prisma.sOAPNote.findMany({
          where: { patientId: userId, clinicId: me.clinicId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            appointmentId: true,
            subjective: true,
            objective: true,
            assessment: true,
            plan: true,
            createdAt: true,
            therapist: { select: { firstName: true, lastName: true } },
            appointment: { select: { dateTime: true, treatmentType: true } },
          },
        })
      : [];

    return NextResponse.json({
      notes: notes.map((n) => ({
        id: n.id,
        appointmentId: n.appointmentId ?? undefined,
        treatmentType: n.appointment?.treatmentType ?? undefined,
        dateTime: n.appointment?.dateTime?.toISOString() ?? undefined,
        subjective: n.subjective,
        objective: n.objective,
        assessment: n.assessment,
        plan: n.plan,
        therapist: n.therapist,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    if (error instanceof AccessError) return accessErrorResponse(error);
    console.error("[patient/clinical-notes] error:", error);
    return NextResponse.json({ error: "Failed to load notes" }, { status: 500 });
  }
}
