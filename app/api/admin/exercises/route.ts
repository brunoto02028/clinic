import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import path from "path";
import { assertValidExerciseFolder } from "@/lib/exercise-folders";
import {
  processAndStoreExerciseVideo,
  MediaStorageError,
  discardStoredMedia,
  ALLOWED_THUMBNAIL_TYPES,
  MAX_THUMBNAIL_BYTES,
  type StoredExerciseMedia,
} from "@/lib/exercise-media";
import { uploadToR2 } from "@/lib/r2";

export const dynamic = "force-dynamic";

// GET - List exercises (library)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const clinicId = (session.user as any)?.clinicId;
  const bodyRegion = searchParams.get("bodyRegion");
  const difficulty = searchParams.get("difficulty");
  const search = searchParams.get("search") || "";
  const translated = searchParams.get("translated"); // "yes" | "no"
  const sort = searchParams.get("sort") || "recent"; // recent | name | region
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const all = searchParams.get("all") === "true"; // For select dropdowns

  const where: any = { isActive: true };
  if (clinicId) where.clinicId = clinicId;
  if (bodyRegion && bodyRegion !== "ALL") where.bodyRegion = bodyRegion;
  if (difficulty && difficulty !== "ALL") where.difficulty = difficulty;
  if (translated === "yes") where.namePt = { not: null };
  if (translated === "no") where.namePt = null;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { namePt: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { tags: { hasSome: [search.toLowerCase()] } },
    ];
  }

  const orderBy: any =
    sort === "name" ? [{ name: "asc" }]
    : sort === "region" ? [{ bodyRegion: "asc" }, { name: "asc" }]
    : [{ createdAt: "desc" }];

  try {
    if (all) {
      const exercises = await prisma.exercise.findMany({
        where,
        orderBy: [{ bodyRegion: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          bodyRegion: true,
          difficulty: true,
          thumbnailUrl: true,
          videoUrl: true,
          defaultSets: true,
          defaultReps: true,
          defaultHoldSec: true,
          defaultRestSec: true,
        },
      });
      return NextResponse.json({ exercises });
    }

    const skip = (page - 1) * limit;
    const [exercises, total] = await Promise.all([
      prisma.exercise.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
          folder: { select: { id: true, name: true } },
          _count: { select: { prescriptions: true } },
        },
      }),
      prisma.exercise.count({ where }),
    ]);

    return NextResponse.json({
      exercises,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    console.error("Exercises GET error:", err);
    return NextResponse.json({ error: "Failed to fetch exercises" }, { status: 500 });
  }
}

// POST - Create exercise (with optional video upload)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Declared outside the try so the catch can roll back a completed upload.
  let storedMedia: StoredExerciseMedia | null = null;

  try {
    const formData = await req.formData();
    const clinicId = (session.user as any)?.clinicId;
    const userId = (session.user as any)?.id;

    if (!clinicId) {
      return NextResponse.json({ error: "No clinic context" }, { status: 400 });
    }

    const name = formData.get("name") as string;
    const description = formData.get("description") as string | null;
    const instructions = formData.get("instructions") as string | null;
    const bodyRegion = formData.get("bodyRegion") as string;
    const difficulty = (formData.get("difficulty") as string) || "BEGINNER";
    const tagsRaw = formData.get("tags") as string | null;
    const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean) : [];
    const defaultSets = formData.get("defaultSets") ? parseInt(formData.get("defaultSets") as string) : null;
    const defaultReps = formData.get("defaultReps") ? parseInt(formData.get("defaultReps") as string) : null;
    const defaultHoldSec = formData.get("defaultHoldSec") ? parseInt(formData.get("defaultHoldSec") as string) : null;
    const defaultRestSec = formData.get("defaultRestSec") ? parseInt(formData.get("defaultRestSec") as string) : null;

    if (!name || !bodyRegion) {
      return NextResponse.json({ error: "Name and body region are required" }, { status: 400 });
    }

    const folderId = (formData.get("folderId") as string | null) || null;
    const folderCheck = await assertValidExerciseFolder(folderId, clinicId);
    if (!folderCheck.ok) {
      return NextResponse.json({ error: folderCheck.error }, { status: folderCheck.status });
    }

    // Handle video upload
    let videoUrl: string | null = null;
    let videoFileName: string | null = null;
    let thumbnailUrl: string | null = null;
    let duration: number | null = null;

    const videoFile = formData.get("video") as File | null;
    const externalVideoUrl = formData.get("videoUrl") as string | null;

    if (videoFile && videoFile.size > 0) {
      const allowedTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/mpeg"];
      if (!allowedTypes.includes(videoFile.type)) {
        return NextResponse.json({ error: "Invalid video format. Allowed: MP4, WebM, MOV, AVI" }, { status: 400 });
      }
      if (videoFile.size > 500 * 1024 * 1024) {
        return NextResponse.json({ error: "Video too large (max 500MB)" }, { status: 400 });
      }

      try {
        const stored = await processAndStoreExerciseVideo(
          Buffer.from(await videoFile.arrayBuffer()),
          videoFile.name,
          // Skip the extracted frame when the request carries its own — it
          // would be overwritten below and stranded in the bucket.
          { extractThumbnail: !(formData.get("thumbnail") as File | null)?.size }
        );
        storedMedia = stored;
        videoUrl = stored.videoUrl;
        thumbnailUrl = stored.thumbnailUrl;
        duration = stored.duration;
        videoFileName = stored.videoFileName;
      } catch (err: any) {
        // Better a refused upload than a video nobody can back up.
        console.error("Exercise media storage failed:", err.message);
        return NextResponse.json(
          { error: err instanceof MediaStorageError ? err.message : "Failed to store the video" },
          { status: 500 }
        );
      }
    } else if (externalVideoUrl) {
      videoUrl = externalVideoUrl;
    }

    // A hand-picked thumbnail overrides the frame ffmpeg pulled.
    const thumbnailFile = formData.get("thumbnail") as File | null;
    if (thumbnailFile && thumbnailFile.size > 0) {
      if (!ALLOWED_THUMBNAIL_TYPES.includes(thumbnailFile.type)) {
        return NextResponse.json({ error: "Thumbnail must be a JPEG, PNG or WebP image" }, { status: 400 });
      }
      if (thumbnailFile.size > MAX_THUMBNAIL_BYTES) {
        return NextResponse.json({ error: "Thumbnail too large (max 5MB)" }, { status: 400 });
      }
      const ext = path.extname(thumbnailFile.name) || ".jpg";
      const uniqueName = `${Date.now()}-thumb${ext}`;
      thumbnailUrl = await uploadToR2(
        `exercises/thumbnails/${uniqueName}`,
        Buffer.from(await thumbnailFile.arrayBuffer())
      );
    }

    const durationRaw = formData.get("duration");
    if (durationRaw) {
      duration = parseInt(durationRaw as string);
    }

    const exercise = await prisma.exercise.create({
      data: {
        clinicId,
        name,
        description,
        instructions,
        bodyRegion: bodyRegion as any,
        difficulty: difficulty as any,
        folderId,
        tags,
        videoUrl,
        videoFileName,
        thumbnailUrl,
        duration,
        defaultSets,
        defaultReps,
        defaultHoldSec,
        defaultRestSec,
        createdById: userId,
      },
    });

    return NextResponse.json({ exercise }, { status: 201 });
  } catch (err: any) {
    console.error("Exercise POST error:", err);
    // The upload succeeded but the row did not, so nothing will ever reference
    // those objects — roll them back rather than leave paid-for clutter.
    await discardStoredMedia(storedMedia);
    return NextResponse.json({ error: "Failed to create exercise" }, { status: 500 });
  }
}
