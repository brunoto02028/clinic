export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, assertRecordAccess, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertTrainingAccess } from "@/lib/workout-access";
import { validateAssessment, deriveAssessment, ageFromDob, type AssessmentInput, type BfMethod } from "@/lib/assessment";

const METHODS: BfMethod[] = ["MANUAL", "BIA", "SKINFOLD"];

// Loads the full assessment and asserts it belongs to the actor's tenant (404
// otherwise). Returns the row so callers don't re-query.
async function loadOwned(actor: Awaited<ReturnType<typeof getActor>>, id: string) {
  const a = await prisma.studentAssessment.findUnique({ where: { id }, include: { photos: true } });
  assertRecordAccess(actor!, { clinicId: a?.clinicId ?? null });
  return a!;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertTrainingAccess(actor);
    const a = await loadOwned(actor, params.id);
    return NextResponse.json(a);
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/assessments/[id]] GET error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// PATCH — merges the provided fields over the stored record (never wipes an
// omitted field), then recomputes the derivations from the merged state.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertTrainingAccess(actor);
    const existing = await loadOwned(actor, params.id);

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);
    const pick = <T,>(k: string, cur: T): T => (has(k) ? (body as any)[k] : cur);

    const bfMethod: BfMethod = has("bfMethod") && METHODS.includes(body.bfMethod) ? body.bfMethod : (existing.bfMethod as BfMethod);
    const merged: AssessmentInput = {
      weightKg: pick("weightKg", existing.weightKg),
      heightCm: pick("heightCm", existing.heightCm),
      sex: pick("sex", existing.sex),
      bfMethod,
      bodyFatPct: pick("bodyFatPct", existing.bodyFatPct),
      skinfolds: pick("skinfolds", existing.skinfolds as any),
      bia: pick("bia", existing.bia as any),
      restingHr: pick("restingHr", existing.restingHr),
      systolic: pick("systolic", existing.systolic),
      diastolic: pick("diastolic", existing.diastolic),
      girths: pick("girths", existing.girths as any),
      notes: pick("notes", existing.notes),
      assessmentType: pick("assessmentType", existing.assessmentType),
    };
    const vErr = validateAssessment(merged);
    if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });

    const dbStudent = await prisma.user.findUnique({ where: { id: existing.studentId }, select: { dateOfBirth: true, sex: true } });
    const sex = merged.sex === "M" || merged.sex === "F" ? merged.sex : dbStudent?.sex ?? null;
    const derived = deriveAssessment({ ...merged, sex }, ageFromDob(dbStudent?.dateOfBirth));

    const updated = await prisma.studentAssessment.update({
      where: { id: params.id },
      data: {
        performedAt: has("performedAt") && body.performedAt ? new Date(body.performedAt) : undefined,
        assessmentType: typeof merged.assessmentType === "string" && merged.assessmentType.trim() ? merged.assessmentType : null,
        weightKg: merged.weightKg ?? null,
        heightCm: merged.heightCm ?? null,
        sex,
        bfMethod,
        bodyFatPct: derived.bodyFatPct,
        skinfolds: (merged.skinfolds as any) ?? undefined,
        bia: (merged.bia as any) ?? undefined,
        restingHr: merged.restingHr ?? null,
        systolic: merged.systolic ?? null,
        diastolic: merged.diastolic ?? null,
        girths: (merged.girths as any) ?? undefined,
        bmi: derived.bmi,
        leanMassKg: derived.leanMassKg,
        fatMassKg: derived.fatMassKg,
        whr: derived.whr,
        notes: merged.notes ?? null,
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/assessments/[id]] PATCH error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertTrainingAccess(actor);
    await loadOwned(actor, params.id);
    await prisma.studentAssessment.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/assessments/[id]] DELETE error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
