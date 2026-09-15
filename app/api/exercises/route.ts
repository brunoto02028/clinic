import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { assertModuleAccess } from "@/lib/module-access";
import { AccessError, accessErrorResponse } from "@/lib/tenant-access";

export const dynamic = "force-dynamic";

// GET - Patient's prescribed exercises
export async function GET(req: NextRequest) {
  const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = effectiveUser.userId;

  try {
    if (effectiveUser.role === "PATIENT") {
      await assertModuleAccess(userId, "mod_exercises");
    }

    const prescriptions = await prisma.exercisePrescription.findMany({
      where: {
        patientId: userId,
        isActive: true,
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
  // Must be impersonation-aware like the GET above, otherwise a staff member
  // previewing a patient hits their own (empty) prescriptions and every
  // completion 404s.
  const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = effectiveUser.userId;

  try {
    if (effectiveUser.role === "PATIENT") {
      await assertModuleAccess(userId, "mod_exercises");
    }

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
