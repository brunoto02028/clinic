import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

// POST — Upload a custom GLB model for body assessment
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const gender = (formData.get("gender") as string) || "male";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!file.name.endsWith(".glb") && !file.name.endsWith(".gltf")) {
      return NextResponse.json({ error: "Only .glb and .gltf files are supported" }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 50MB." }, { status: 400 });
    }

    const modelsDir = path.join(process.cwd(), "public", "models");
    await fs.mkdir(modelsDir, { recursive: true });

    const fileName = `human-${gender}.glb`;
    const filePath = path.join(modelsDir, fileName);

    // Backup existing model
    try {
      await fs.access(filePath);
      const backupPath = path.join(modelsDir, `human-${gender}.backup.glb`);
      await fs.copyFile(filePath, backupPath);
    } catch {
      // No existing file to backup
    }

    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(filePath, new Uint8Array(arrayBuffer));

    return NextResponse.json({
      success: true,
      fileName,
      filePath: `/models/${fileName}`,
      size: arrayBuffer.byteLength,
      message: `Model saved as ${fileName}. Refresh the body assessment page to see it.`,
    });
  } catch (err: any) {
    console.error("[body-models] Upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET — List available body models
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const modelsDir = path.join(process.cwd(), "public", "models");
    const models: { name: string; gender: string; path: string; size: number }[] = [];

    try {
      const files = await fs.readdir(modelsDir);
      for (const file of files) {
        if (file.startsWith("human") && file.endsWith(".glb") && !file.includes("backup")) {
          const stat = await fs.stat(path.join(modelsDir, file));
          const gender = file.includes("female") ? "female" : file.includes("male") ? "male" : "default";
          models.push({
            name: file,
            gender,
            path: `/models/${file}`,
            size: stat.size,
          });
        }
      }
    } catch {
      // models dir might not exist
    }

    return NextResponse.json({ models });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
