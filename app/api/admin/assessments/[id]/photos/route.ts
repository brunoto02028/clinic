export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, assertRecordAccess, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertTrainingAccess } from "@/lib/workout-access";
import { randomUUID } from "crypto";
import { uploadToR2, deleteFromR2 } from "@/lib/r2";

const POSES = ["FRONT", "SIDE", "BACK"];
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
// Raster allowlist only — never store SVG (executable in the browser → stored XSS).
const TYPE_EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const EXT_TYPE: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };

// POST (multipart) — upload a progress photo for an assessment. Requires the
// student's photo consent; staff + tenant scoped.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertTrainingAccess(actor);

    const assessment = await prisma.studentAssessment.findUnique({
      where: { id: params.id },
      select: { id: true, clinicId: true, studentId: true, student: { select: { photoConsentAt: true } } },
    });
    assertRecordAccess(actor, { clinicId: assessment?.clinicId ?? null });
    if (!assessment!.student.photoConsentAt) {
      return NextResponse.json({ error: "Photo consent not granted" }, { status: 403 });
    }

    let form: any;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
    }
    const pose = String(form.get("pose") || "").toUpperCase();
    const file = form.get("image") as File | null;
    if (!POSES.includes(pose)) return NextResponse.json({ error: "pose must be FRONT/SIDE/BACK" }, { status: 400 });
    if (!file) return NextResponse.json({ error: "image is required" }, { status: 400 });
    // Reject on the declared size BEFORE materialising the body in memory.
    if (typeof file.size === "number" && file.size > MAX_BYTES) return NextResponse.json({ error: "image too large (max 15MB)" }, { status: 400 });

    // Resolve a safe raster content-type: from the MIME allowlist, else infer
    // from the filename extension (some clients send an empty MIME).
    let ext = TYPE_EXT[file.type];
    if (!ext) {
      const nameExt = ((file as any).name || "").split(".").pop()?.toLowerCase();
      if (nameExt && EXT_TYPE[nameExt]) ext = TYPE_EXT[EXT_TYPE[nameExt]];
    }
    if (!ext) return NextResponse.json({ error: "image must be PNG, JPEG or WebP" }, { status: 400 });
    const contentType = EXT_TYPE[ext];

    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > MAX_BYTES) return NextResponse.json({ error: "image too large (max 15MB)" }, { status: 400 });

    const key = `assessments/${assessment!.clinicId}/${assessment!.studentId}/${assessment!.id}/${pose}-${Date.now()}-${randomUUID()}.${ext}`;
    const url = await uploadToR2(key, buf, contentType);

    try {
      const photo = await prisma.assessmentPhoto.create({
        data: { clinicId: assessment!.clinicId, assessmentId: assessment!.id, studentId: assessment!.studentId, pose, url, path: key },
      });
      return NextResponse.json(photo, { status: 201 });
    } catch (e) {
      // Don't leave an orphan object if the row can't be written.
      await deleteFromR2(key).catch(() => {});
      throw e;
    }
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/assessments/[id]/photos] POST error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
