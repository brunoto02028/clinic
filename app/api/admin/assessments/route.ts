export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, tenantWhere, assertPatientAccess, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertTrainingAccess } from "@/lib/workout-access";
import { validateAssessment, deriveAssessment, ageFromDob, type AssessmentInput, type BfMethod } from "@/lib/assessment";

const METHODS: BfMethod[] = ["MANUAL", "BIA", "SKINFOLD"];

// GET — the tenant's assessments for a student (?studentId=), newest first.
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertTrainingAccess(actor);
    const studentId = request.nextUrl.searchParams.get("studentId");
    if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    await assertPatientAccess(actor, studentId);

    const assessments = await prisma.studentAssessment.findMany({
      where: { ...tenantWhere(actor), studentId },
      include: { photos: true },
      orderBy: { performedAt: "desc" },
    });
    return NextResponse.json(assessments);
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/assessments] GET error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// POST — record a new assessment for a student in the tenant.
export async function POST(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = await assertTrainingAccess(actor);

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    const studentId = body.studentId;
    if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    const student = await assertPatientAccess(actor, studentId);

    const input = body as AssessmentInput;
    const vErr = validateAssessment(input);
    if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });
    const bfMethod: BfMethod = METHODS.includes(body.bfMethod) ? body.bfMethod : "MANUAL";

    // Age + sex for the skinfold formula: prefer the request's sex, else the
    // student's profile; age from the student's date of birth.
    const dbStudent = await prisma.user.findUnique({ where: { id: student.id }, select: { dateOfBirth: true, sex: true } });
    const sex = input.sex === "M" || input.sex === "F" ? input.sex : dbStudent?.sex ?? null;
    const derived = deriveAssessment({ ...input, bfMethod, sex }, ageFromDob(dbStudent?.dateOfBirth));

    const created = await prisma.studentAssessment.create({
      data: {
        clinicId,
        studentId: student.id,
        trainerId: actor.userId,
        performedAt: input.performedAt ? new Date(input.performedAt) : new Date(),
        weightKg: input.weightKg ?? null,
        heightCm: input.heightCm ?? null,
        sex,
        bfMethod,
        bodyFatPct: derived.bodyFatPct,
        skinfolds: (input.skinfolds as any) ?? undefined,
        bia: (input.bia as any) ?? undefined,
        restingHr: input.restingHr ?? null,
        systolic: input.systolic ?? null,
        diastolic: input.diastolic ?? null,
        girths: (input.girths as any) ?? undefined,
        bmi: derived.bmi,
        leanMassKg: derived.leanMassKg,
        fatMassKg: derived.fatMassKg,
        whr: derived.whr,
        notes: typeof input.notes === "string" ? input.notes : null,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/assessments] POST error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
