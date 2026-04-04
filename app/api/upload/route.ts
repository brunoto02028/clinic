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

    // Max 5MB for base64 storage
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    console.log('[upload] Processing file:', file.name, file.type, `${(file.size / 1024).toFixed(0)}KB`);

    // Convert to base64 and store in database
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    console.log('[upload] Converted to base64, size:', `${(base64.length / 1024).toFixed(0)}KB`);

    const uniqueName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const imageUrl = dataUrl;
    const cloud_storage_path = `base64:inline`;

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
        fileSize: file.size,
        mimeType: file.type,
        imageUrl,
        cloud_storage_path,
        altText: null,
        category,
        uploadedById: userId,
      },
    });

    return NextResponse.json({
      success: true,
      image: {
        id: image.id,
        fileName: image.fileName,
        originalName: image.originalName,
        fileSize: image.fileSize,
        mimeType: image.mimeType,
        imageUrl,
        cloud_storage_path,
        category: image.category,
        createdAt: image.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
