import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { assertValidExerciseFolder, resolveClinicId } from "@/lib/exercise-folders";
import { deleteR2Url, uploadToR2 } from "@/lib/r2";
import { processAndStoreExerciseVideo, MediaStorageError } from "@/lib/exercise-media";
import { ALLOWED_THUMBNAIL_TYPES, MAX_THUMBNAIL_BYTES } from "@/lib/exercise-media";
import path from "path";

export const dynamic = "force-dynamic";

// GET - Single exercise
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const exercise = await prisma.exercise.findUnique({
      where: { id },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        prescriptions: {
          where: { isActive: true },
          include: {
            patient: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!exercise) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    return NextResponse.json({ exercise });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch exercise" }, { status: 500 });
  }
}

// PATCH - Update exercise
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const callerClinicId = await resolveClinicId(session);
    const owner = await prisma.exercise.findUnique({
      where: { id },
      select: { clinicId: true, videoUrl: true, thumbnailUrl: true },
    });
    // Uploading over someone else's exercise would delete their video.
    if (!owner || owner.clinicId !== callerClinicId) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    const formData = await req.formData();

    const updateData: any = {};

    const name = formData.get("name") as string | null;
    if (name) updateData.name = name;

    const description = formData.get("description");
    if (description !== null) updateData.description = description as string;

    const instructions = formData.get("instructions");
    if (instructions !== null) updateData.instructions = instructions as string;

    // Portuguese translation fields (optional)
    const namePt = formData.get("namePt");
    if (namePt !== null) updateData.namePt = (namePt as string) || null;

    const descriptionPt = formData.get("descriptionPt");
    if (descriptionPt !== null) updateData.descriptionPt = (descriptionPt as string) || null;

    const instructionsPt = formData.get("instructionsPt");
    if (instructionsPt !== null) updateData.instructionsPt = (instructionsPt as string) || null;

    const bodyRegion = formData.get("bodyRegion") as string | null;
    if (bodyRegion) updateData.bodyRegion = bodyRegion;

    // Same rule as creation: an exercise moves between folders, never out of
    // one. Leaving PATCH unguarded would let the bulk "move" action recreate
    // the loose videos the whole hierarchy exists to prevent.
    const folderId = formData.get("folderId");
    if (folderId !== null) {
      const clinicId = await resolveClinicId(session);
      if (!clinicId) {
        return NextResponse.json({ error: "No clinic context" }, { status: 400 });
      }
      const check = await assertValidExerciseFolder(folderId as string, clinicId);
      if (!check.ok) {
        return NextResponse.json({ error: check.error }, { status: check.status });
      }
      updateData.folderId = folderId as string;
    }

    const difficulty = formData.get("difficulty") as string | null;
    if (difficulty) updateData.difficulty = difficulty;

    const tagsRaw = formData.get("tags") as string | null;
    if (tagsRaw !== null) {
      updateData.tags = tagsRaw.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    }

    const defaultSets = formData.get("defaultSets");
    if (defaultSets !== null) updateData.defaultSets = defaultSets ? parseInt(defaultSets as string) : null;

    const defaultReps = formData.get("defaultReps");
    if (defaultReps !== null) updateData.defaultReps = defaultReps ? parseInt(defaultReps as string) : null;

    const defaultHoldSec = formData.get("defaultHoldSec");
    if (defaultHoldSec !== null) updateData.defaultHoldSec = defaultHoldSec ? parseInt(defaultHoldSec as string) : null;

    const defaultRestSec = formData.get("defaultRestSec");
    if (defaultRestSec !== null) updateData.defaultRestSec = defaultRestSec ? parseInt(defaultRestSec as string) : null;

    const durationRaw = formData.get("duration");
    if (durationRaw !== null) updateData.duration = durationRaw ? parseInt(durationRaw as string) : null;

    // The sound toggle: a property of the exercise, changeable at any time,
    // so the decision is never locked into the file itself.
    const muteForPatient = formData.get("muteForPatient");
    if (muteForPatient !== null) updateData.muteForPatient = muteForPatient === "true";

    // Handle video upload
    const videoFile = formData.get("video") as File | null;
    const externalVideoUrl = formData.get("videoUrl") as string | null;
    // Old objects are only dropped after the row is updated, so a failed write
    // leaves clutter rather than a broken player.
    let replacedMedia: (string | null)[] = [];

    if (videoFile && videoFile.size > 0) {
      const allowedTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/mpeg"];
      if (!allowedTypes.includes(videoFile.type)) {
        return NextResponse.json({ error: "Invalid video format" }, { status: 400 });
      }
      if (videoFile.size > 500 * 1024 * 1024) {
        return NextResponse.json({ error: "Video too large (max 500MB)" }, { status: 400 });
      }

      try {
        const stored = await processAndStoreExerciseVideo(
          Buffer.from(await videoFile.arrayBuffer()),
          videoFile.name,
          // A manual thumbnail in the same request would orphan the extracted
          // one the moment it overwrote the URL.
          { extractThumbnail: !(formData.get("thumbnail") as File | null)?.size }
        );
        updateData.videoUrl = stored.videoUrl;
        updateData.videoFileName = stored.videoFileName;
        updateData.hasAudio = stored.hasAudio;
        if (stored.thumbnailUrl) updateData.thumbnailUrl = stored.thumbnailUrl;
        if (durationRaw === null) updateData.duration = stored.duration;
        replacedMedia = [owner.videoUrl, owner.thumbnailUrl];
      } catch (err: any) {
        console.error("Exercise media storage failed:", err.message);
        return NextResponse.json(
          { error: err instanceof MediaStorageError ? err.message : "Failed to store the video" },
          { status: 500 }
        );
      }
    } else if (externalVideoUrl !== null) {
      updateData.videoUrl = externalVideoUrl || null;
    }

    // A hand-picked thumbnail replaces whatever ffmpeg extracted above.
    const thumbnailFile = formData.get("thumbnail") as File | null;
    if (thumbnailFile && thumbnailFile.size > 0) {
      // This lands on a public domain, so it gets the same checks as creation:
      // an unvalidated upload here would serve arbitrary content, SVG included.
      if (!ALLOWED_THUMBNAIL_TYPES.includes(thumbnailFile.type)) {
        return NextResponse.json({ error: "Thumbnail must be a JPEG, PNG or WebP image" }, { status: 400 });
      }
      if (thumbnailFile.size > MAX_THUMBNAIL_BYTES) {
        return NextResponse.json({ error: "Thumbnail too large (max 5MB)" }, { status: 400 });
      }
      const ext = path.extname(thumbnailFile.name) || ".jpg";
      const uniqueName = `${Date.now()}-thumb${ext}`;
      updateData.thumbnailUrl = await uploadToR2(
        `exercises/thumbnails/${uniqueName}`,
        Buffer.from(await thumbnailFile.arrayBuffer())
      );
    }

    const exercise = await prisma.exercise.update({
      where: { id },
      data: updateData,
    });

    for (const url of replacedMedia) {
      try {
        await deleteR2Url(url);
      } catch (mediaErr: any) {
        console.error("Failed to remove replaced media:", mediaErr.message);
      }
    }

    return NextResponse.json({ exercise });
  } catch (err: any) {
    console.error("Exercise PATCH error:", err);
    return NextResponse.json({ error: "Failed to update exercise" }, { status: 500 });
  }
}

// DELETE - Soft delete exercise
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const clinicId = await resolveClinicId(session);
    const existing = await prisma.exercise.findUnique({
      where: { id },
      select: { clinicId: true, videoUrl: true, thumbnailUrl: true },
    });
    // Deleting used to flip a reversible boolean; it now destroys the only copy
    // of the video, so an id belonging to another clinic must not be reachable.
    if (!existing || existing.clinicId !== clinicId) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    // Database first. If this write fails after the objects are gone, the row
    // stays active pointing at dead URLs and the video is unrecoverable —
    // whereas an object left behind is only clutter.
    await prisma.exercise.update({
      where: { id },
      data: { isActive: false, videoUrl: null, thumbnailUrl: null },
    });

    // The row is kept (prescription history references it) but the media is
    // not: an inactive exercise is never watched again, and leaving the objects
    // behind is how the VPS ended up with 296 orphaned files.
    let removedMedia = 0;
    for (const url of [existing.videoUrl, existing.thumbnailUrl]) {
      try {
        if (await deleteR2Url(url)) removedMedia++;
      } catch (mediaErr: any) {
        // Storage trouble must not block the deletion the user asked for.
        console.error("Failed to remove media from R2:", mediaErr.message);
      }
    }

    return NextResponse.json({ success: true, removedMedia });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to delete exercise" }, { status: 500 });
  }
}
