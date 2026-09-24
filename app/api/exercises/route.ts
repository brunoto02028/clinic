import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { AccessError, accessErrorResponse } from "@/lib/tenant-access";
import { patientPrescriptionWhere } from "@/lib/protocol-exercise-gating";
import { isTrainingBlockedToday, trainingBlockedResponse } from "@/lib/exercise-gate";
import { patientGate } from "@/lib/patient-gate";

export const dynamic = "force-dynamic";

// GET - Patient's prescribed exercises
export async function GET(req: NextRequest) {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate({ module: "mod_exercises" });
  if (__gate.response) return __gate.response;

  const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = effectiveUser.userId;

  try {

    // Exercises of protocol weeks not released yet stay out, like the items themselves.
    const prescriptions = await prisma.exercisePrescription.findMany({
      where: {
        patientId: userId,
        isActive: true,
        ...(await patientPrescriptionWhere(userId)),
      },
      orderBy: [{ exercise: { bodyRegion: "asc" } }, { createdAt: "desc" }],
      include: {
        exercise: {
          select: {
            id: true,
            name: true,
            description: true,
            instructions: true,
            // Portuguese translations (filled by the admin "Traduzir PT" action)
            namePt: true,
            descriptionPt: true,
            instructionsPt: true,
            folderId: true,
            folder: { select: { id: true, name: true } },
            bodyRegion: true,
            difficulty: true,
            videoUrl: true,
            thumbnailUrl: true,
            duration: true,
            muteForPatient: true,
            defaultSets: true,
            defaultReps: true,
            defaultHoldSec: true,
            defaultRestSec: true,
          },
        },
        therapist: { select: { firstName: true, lastName: true } },
        // Last 14 days is enough for the "this week" strip (activity 43) —
        // mirrors the same window used for protocol items (activity 42).
        completionLogs: {
          where: { completedDate: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
          select: { completedDate: true },
        },
      },
    });

    return NextResponse.json({ prescriptions });
  } catch (err: any) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("Patient exercises GET error:", err);
    return NextResponse.json({ error: "Failed to fetch exercises" }, { status: 500 });
  }
}

// PATCH - Patient toggles "did it today" (or a given date) for one
// prescription (activity 43 — mirrors the toggleLog on
// app/api/patient/protocol/route.ts for protocol items). Marks on the first
// call for a given date, unmarks on the second — replaces the old
// increment-only counter, which never recorded which day.
export async function PATCH(req: NextRequest) {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate({ module: "mod_exercises" });
  if (__gate.response) return __gate.response;

  // Must be impersonation-aware like the GET above, otherwise a staff member
  // previewing a patient hits their own (empty) prescriptions and every
  // completion 404s.
  const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = effectiveUser.userId;

  try {

    const { prescriptionId, date } = await req.json();

    if (!prescriptionId) {
      return NextResponse.json({ error: "Prescription ID required" }, { status: 400 });
    }

    // Verify the prescription belongs to the patient
    const prescription = await prisma.exercisePrescription.findFirst({
      where: { id: prescriptionId, patientId: userId },
    });

    if (!prescription) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }

    // Truncate to a bare date (no time) — Europe/London, matching the clinic.
    const dateStr = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date
      : new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" }); // en-CA gives YYYY-MM-DD
    const completedDate = new Date(`${dateStr}T00:00:00.000Z`);

    const existing = await (prisma as any).exerciseCompletionLog.findUnique({
      where: {
        exercisePrescriptionId_patientId_completedDate: {
          exercisePrescriptionId: prescriptionId,
          patientId: userId,
          completedDate,
        },
      },
    });

    // Same gate as the protocol items: the block has to exist on the server,
    // or it is only a disabled button (activity 074, T-11).
    if (!existing) {
      const gate = await isTrainingBlockedToday(userId, dateStr);
      if (gate.blocked) {
        return NextResponse.json(trainingBlockedResponse(gate), { status: 409 });
      }
    }

    if (existing) {
      await (prisma as any).exerciseCompletionLog.delete({ where: { id: existing.id } });
    } else {
      await (prisma as any).exerciseCompletionLog.create({
        data: { exercisePrescriptionId: prescriptionId, patientId: userId, completedDate },
      });
    }

    // completedCount/lastCompletedAt derive from the actual log rows after
    // every toggle — an independent increment-only counter would drift the
    // moment a day gets unmarked.
    const remaining = await (prisma as any).exerciseCompletionLog.findMany({
      where: { exercisePrescriptionId: prescriptionId, patientId: userId },
      orderBy: { completedDate: "desc" },
      select: { completedDate: true },
    });
    const updated = await prisma.exercisePrescription.update({
      where: { id: prescriptionId },
      data: {
        completedCount: remaining.length,
        lastCompletedAt: remaining[0]?.completedDate || null,
      },
    });

    return NextResponse.json({ prescription: updated, marked: !existing, date: dateStr });
  } catch (err: any) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
  }
}
