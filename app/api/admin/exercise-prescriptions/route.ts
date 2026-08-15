import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { notifyPatient } from "@/lib/notify-patient";

export const dynamic = "force-dynamic";

// GET - List prescriptions (optionally filtered by patient)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const clinicId = (session.user as any)?.clinicId;
  const patientId = searchParams.get("patientId");
  const exerciseId = searchParams.get("exerciseId");
  const activeOnly = searchParams.get("active") !== "false";

  const where: any = {};
  if (clinicId) where.clinicId = clinicId;
  if (patientId) where.patientId = patientId;
  if (exerciseId) where.exerciseId = exerciseId;
  if (activeOnly) where.isActive = true;

  try {
    const prescriptions = await prisma.exercisePrescription.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        exercise: {
          select: {
            id: true,
            name: true,
            bodyRegion: true,
            difficulty: true,
            videoUrl: true,
            thumbnailUrl: true,
            description: true,
            instructions: true,
            duration: true,
            defaultSets: true,
            defaultReps: true,
            defaultHoldSec: true,
            defaultRestSec: true,
          },
        },
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        therapist: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ prescriptions });
  } catch (err: any) {
    console.error("Prescriptions GET error:", err);
    return NextResponse.json({ error: "Failed to fetch prescriptions" }, { status: 500 });
  }
}

// POST - Prescribe exercises to a patient (bulk)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const clinicId = (session.user as any)?.clinicId;
    const therapistId = (session.user as any)?.id;

    if (!clinicId) {
      return NextResponse.json({ error: "No clinic context" }, { status: 400 });
    }

    const { patientId, folderId, frequency, notes } = body;
    // exercises: Array<{ exerciseId, sets?, reps?, holdSeconds?, restSeconds?, frequency?, notes?, startDate?, endDate? }>
    let exercises = body.exercises;

    if (!patientId) {
      return NextResponse.json({ error: "Patient is required" }, { status: 400 });
    }

    // Prescribing a whole folder resolves its contents here rather than
    // trusting a list assembled by the browser: the library view is paginated,
    // so a client-built list can silently be a partial folder. Passing the
    // folder id makes "the whole folder" mean exactly that.
    let folderName: string | null = null;
    if (!exercises && folderId) {
      const folder = await prisma.exerciseFolder.findFirst({
        where: { id: folderId, clinicId },
        select: { id: true, name: true },
      });
      if (!folder) {
        return NextResponse.json({ error: "Folder not found" }, { status: 404 });
      }
      folderName = folder.name;

      // A category holds its videos in child folders; a folder holds them
      // directly. Covering both means picking either level works.
      const children = await prisma.exerciseFolder.findMany({
        where: { parentId: folder.id, clinicId },
        select: { id: true },
      });
      const folderIds = [folder.id, ...children.map((c) => c.id)];

      const found = await prisma.exercise.findMany({
        where: { clinicId, isActive: true, folderId: { in: folderIds } },
        select: {
          id: true,
          defaultSets: true,
          defaultReps: true,
          defaultHoldSec: true,
          defaultRestSec: true,
        },
        orderBy: { createdAt: "asc" },
      });

      exercises = found.map((ex) => ({
        exerciseId: ex.id,
        sets: ex.defaultSets,
        reps: ex.defaultReps,
        holdSeconds: ex.defaultHoldSec,
        restSeconds: ex.defaultRestSec,
        frequency: frequency || null,
        notes: notes || null,
      }));

      if (exercises.length === 0) {
        return NextResponse.json(
          { error: `"${folder.name}" has no active exercises to prescribe` },
          { status: 400 }
        );
      }
    }

    if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
      return NextResponse.json({ error: "Patient and at least one exercise are required" }, { status: 400 });
    }

    // Verify patient exists
    const patient = await prisma.user.findFirst({
      where: { id: patientId, clinicId, role: "PATIENT" },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Skip exercises the patient already has active — prescribing a whole
    // folder twice would otherwise show the same video repeated in their list.
    const existing = await prisma.exercisePrescription.findMany({
      where: {
        patientId,
        isActive: true,
        exerciseId: { in: exercises.map((ex: any) => ex.exerciseId) },
      },
      select: { exerciseId: true },
    });
    const alreadyPrescribed = new Set(existing.map((e) => e.exerciseId));
    const toCreate = exercises.filter((ex: any) => !alreadyPrescribed.has(ex.exerciseId));
    const skipped = exercises.length - toCreate.length;

    if (toCreate.length === 0) {
      return NextResponse.json({ prescriptions: [], count: 0, skipped, folderName }, { status: 200 });
    }

    const created = await prisma.$transaction(
      toCreate.map((ex: any) =>
        prisma.exercisePrescription.create({
          data: {
            clinicId,
            therapistId,
            patientId,
            exerciseId: ex.exerciseId,
            sets: ex.sets || null,
            reps: ex.reps || null,
            holdSeconds: ex.holdSeconds || null,
            restSeconds: ex.restSeconds || null,
            frequency: ex.frequency || null,
            notes: ex.notes || null,
            startDate: ex.startDate ? new Date(ex.startDate) : new Date(),
            endDate: ex.endDate ? new Date(ex.endDate) : null,
          },
        })
      )
    );

    // Tell the patient the work arrived. Once per call, never once per
    // exercise: prescribing a folder of twenty would otherwise land as twenty
    // separate messages. notifyPatient routes to whichever channel the patient
    // chose, and a failure here must not undo prescriptions already written.
    let notified: { channel: string; success: boolean } | null = null;
    try {
      const count = created.length;
      const programme = folderName || (count === 1 ? "New exercise" : "New exercises");
      const appUrl = process.env.NEXTAUTH_URL || "https://bpr.clinic";
      const result = await notifyPatient({
        patientId,
        emailTemplateSlug: "EXERCISES_PRESCRIBED",
        emailVars: {
          patientName: patient.firstName || "there",
          exerciseCount: String(count),
          programmeName: programme,
          portalUrl: `${appUrl}/dashboard/exercises`,
        },
        plainMessage: `Your clinic added ${count} new exercise${count === 1 ? "" : "s"} (${programme}) to your portal: ${appUrl}/dashboard/exercises`,
        plainMessagePt: `A sua clínica adicionou ${count} novo${count === 1 ? "" : "s"} exercício${count === 1 ? "" : "s"} (${programme}) ao seu portal: ${appUrl}/dashboard/exercises`,
      });
      notified = { channel: result.channel, success: result.success };
      if (!result.success) {
        console.error("[prescriptions] Failed to notify patient:", result.error);
      }
    } catch (e) {
      console.error("[prescriptions] Notification threw:", e);
    }

    return NextResponse.json(
      { prescriptions: created, count: created.length, skipped, folderName, notified },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Prescription POST error:", err);
    return NextResponse.json({ error: "Failed to create prescriptions" }, { status: 500 });
  }
}

// PATCH - Update a prescription (deactivate, update sets/reps, etc.)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "Prescription ID required" }, { status: 400 });
    }

    const prescription = await prisma.exercisePrescription.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ prescription });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to update prescription" }, { status: 500 });
  }
}
