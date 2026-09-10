export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, assertRecordAccess, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertTrainingAccess } from "@/lib/workout-access";

// DELETE — remove a progress photo (staff, tenant-scoped). The R2 object is left
// in place (cheap, private bucket); only the DB reference is removed.
export async function DELETE(request: NextRequest, { params }: { params: { id: string; photoId: string } }) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertTrainingAccess(actor);

    const photo = await prisma.assessmentPhoto.findUnique({
      where: { id: params.photoId },
      select: { id: true, clinicId: true, assessmentId: true },
    });
    // 404 for a missing photo, another tenant's, or one on a different assessment.
    assertRecordAccess(actor, { clinicId: photo?.clinicId ?? null });
    if (!photo || photo.assessmentId !== params.id) throw new AccessError(404, "Not found");

    await prisma.assessmentPhoto.delete({ where: { id: params.photoId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/assessments/[id]/photos/[photoId]] DELETE error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
