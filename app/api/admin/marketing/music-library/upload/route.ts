import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const allowed = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/mp4", "audio/aac", "audio/x-m4a"];
    if (!allowed.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|m4a|aac)$/i)) {
      return NextResponse.json({ error: "Only audio files allowed (mp3, wav, ogg, m4a, aac)" }, { status: 400 });
    }

    // Max 50MB
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
    }

    const uploadsDir = process.env.UPLOADS_DIR
      ? path.join(process.env.UPLOADS_DIR, "music")
      : path.join(process.cwd(), "public", "uploads", "music");
    await mkdir(uploadsDir, { recursive: true });

    const ext = path.extname(file.name) || ".mp3";
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").replace(ext, "");
    const uniqueName = `${Date.now()}-${safeName}${ext}`;
    const filePath = path.join(uploadsDir, uniqueName);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, new Uint8Array(bytes));

    const audioUrl = `/uploads/music/${uniqueName}`;
    return NextResponse.json({ url: audioUrl, name: file.name });
  } catch (error: any) {
    console.error("Audio upload error:", error);
    return NextResponse.json({ error: "Upload failed: " + error.message }, { status: 500 });
  }
}
