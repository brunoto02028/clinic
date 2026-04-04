import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

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

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    console.log('[upload] Processing file:', file.name, file.type, `${(file.size / 1024).toFixed(0)}KB`);
    console.log('[upload] RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);

    // Generate unique filename
    const ext = file.name.split('.').pop() || "jpg";
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").replace(`.${ext}`, "");
    const uniqueName = `${Date.now()}-${safeName}.${ext}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to persistent volume (Railway volume or local public folder)
    const isRailway = process.env.RAILWAY_ENVIRONMENT === 'production';
    const uploadsDir = isRailway 
      ? '/app/data/uploads' // Railway persistent volume
      : path.join(process.cwd(), "public", "uploads"); // Local development
    
    console.log('[upload] Environment:', isRailway ? 'Railway (production)' : 'Local (development)');
    console.log('[upload] Target directory:', uploadsDir);
    console.log('[upload] Directory exists:', existsSync(uploadsDir));
    
    if (!existsSync(uploadsDir)) {
      console.log('[upload] Creating uploads directory:', uploadsDir);
      try {
        mkdirSync(uploadsDir, { recursive: true });
        console.log('[upload] Directory created successfully');
      } catch (err: any) {
        console.error('[upload] Failed to create directory:', err.message);
        throw new Error(`Failed to create uploads directory: ${err.message}`);
      }
    }

    const filePath = path.join(uploadsDir, uniqueName);
    console.log('[upload] Writing file to:', filePath);
    
    try {
      writeFileSync(filePath, buffer);
      console.log('[upload] File written successfully');
    } catch (err: any) {
      console.error('[upload] Failed to write file:', err.message);
      throw new Error(`Failed to write file: ${err.message}`);
    }

    // For Railway, files are served via API route, not public folder
    const imageUrl = isRailway 
      ? `/api/uploads/${uniqueName}` 
      : `/uploads/${uniqueName}`;
    const cloud_storage_path = isRailway 
      ? `railway:/data/uploads/${uniqueName}` 
      : `local:${imageUrl}`;

    console.log('[upload] Environment:', isRailway ? 'Railway' : 'Local');
    console.log('[upload] Saved file to:', filePath);
    console.log('[upload] Public URL:', imageUrl);

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
