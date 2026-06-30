import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole === "PATIENT") {
      return NextResponse.json({ error: "Only staff can upload images" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const category = (formData.get("category") as string) || "general";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    // Max 10MB for file storage
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    console.log('[upload] Processing file:', file.name, file.type, `${(file.size / 1024).toFixed(0)}KB`);

    const bytes = await file.arrayBuffer();
    const inputBuffer = Buffer.from(bytes);

    // Max width per category (px) — hero/logo larger, thumbnails smaller
    const MAX_WIDTHS: Record<string, number> = {
      hero: 1920, logo: 800, about: 1200, services: 1200,
      general: 1200, article: 1200, og: 1200,
    };
    const maxWidth = MAX_WIDTHS[category] ?? 1200;

    // Optimise: convert to WebP, resize (max width), quality 80, strip EXIF
    let optimisedBuffer: Buffer;
    let finalMimeType = "image/webp";
    try {
      const sharp = (await import("sharp")).default;
      optimisedBuffer = await sharp(inputBuffer)
        .rotate()                          // auto-orient from EXIF
        .resize({ width: maxWidth, withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toBuffer();
    } catch (sharpErr) {
      console.warn('[upload] sharp optimisation failed, storing original:', sharpErr);
      optimisedBuffer = inputBuffer;
      finalMimeType = file.type;
    }

    const sizeBefore = Math.round(file.size / 1024);
    const sizeAfter  = Math.round(optimisedBuffer.length / 1024);
    console.log(`[upload] Optimised ${sizeBefore}KB → ${sizeAfter}KB WebP (max ${maxWidth}px)`);

    const base64 = optimisedBuffer.toString("base64");
    const imageUrl = `data:${finalMimeType};base64,${base64}`;
    const cloud_storage_path = "dataurl:inline";

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").replace(/\.[^.]+$/, ".webp");
    const uniqueName = `${Date.now()}-${sanitizedName}`;

    // Resolve user ID - session ID may not match DB if JWT is stale
    let userId = (session.user as any).id;
    const userEmail = session.user?.email;

    // Verify user exists in DB, fallback to email lookup
    const dbUser = await prisma.user.findFirst({
      where: userId ? { id: userId } : { email: userEmail || "" },
      select: { id: true },
    });

    if (!dbUser && userEmail) {
      const userByEmail = await prisma.user.findUnique({
        where: { email: userEmail },
        select: { id: true },
      });
      if (userByEmail) userId = userByEmail.id;
    } else if (dbUser) {
      userId = dbUser.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "User not found in database" }, { status: 400 });
    }

    const image = await prisma.imageLibrary.create({
      data: {
        fileName: uniqueName,
        originalName: file.name,
        fileSize: optimisedBuffer.length,
        mimeType: finalMimeType,
        imageUrl,                  // base64 stored in DB
        cloud_storage_path,
        altText: null,
        category,
        uploadedById: userId,
      },
    });

    // Return a short serve URL instead of the full base64 — keeps settings payload small
    const serveUrl = `/api/image-serve/${image.id}`;

    return NextResponse.json({
      success: true,
      image: {
        id: image.id,
        fileName: image.fileName,
        originalName: image.originalName,
        fileSize: image.fileSize,
        mimeType: image.mimeType,
        imageUrl: serveUrl,
        cloud_storage_path,
        category: image.category,
        createdAt: image.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error: "Failed to upload file",
        detail: error.message || String(error),
        code: error.code,
      },
      { status: 500 }
    );
  }
}
