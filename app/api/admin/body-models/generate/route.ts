import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getConfigValue } from "@/lib/system-config";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const MESHY_BASE = "https://api.meshy.ai/openapi/v2";

// POST — Create a text-to-3D task via Meshy AI
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = await getConfigValue("MESHY_API_KEY");
    if (!apiKey) {
      return NextResponse.json({
        error: "Meshy AI API key not configured. Go to Settings → API Keys and add your MESHY_API_KEY (free at meshy.ai).",
      }, { status: 400 });
    }

    const body = await req.json();
    const { prompt, gender, artStyle } = body;

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    // Create text-to-3D preview task
    const createRes = await fetch(`${MESHY_BASE}/text-to-3d`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "preview",
        prompt,
        art_style: artStyle || "realistic",
        ai_model: "meshy-6",
        topology: "triangle",
        target_polycount: 30000,
        should_remesh: false,
        symmetry_mode: "on",
        pose_mode: "a-pose",
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("[meshy] Create task failed:", createRes.status, errText);
      return NextResponse.json({ error: `Meshy API error: ${createRes.status} - ${errText}` }, { status: 500 });
    }

    const { result: taskId } = await createRes.json();

    return NextResponse.json({
      taskId,
      gender: gender || "male",
      message: "3D model generation started. Poll status with GET /api/admin/body-models/generate?taskId=...",
    });
  } catch (err: any) {
    console.error("[meshy] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET — Check task status or download completed model
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = await getConfigValue("MESHY_API_KEY");
    if (!apiKey) {
      return NextResponse.json({ error: "Meshy API key not configured" }, { status: 400 });
    }

    const taskId = req.nextUrl.searchParams.get("taskId");
    const download = req.nextUrl.searchParams.get("download") === "true";
    const gender = req.nextUrl.searchParams.get("gender") || "male";

    if (!taskId) {
      return NextResponse.json({ error: "taskId required" }, { status: 400 });
    }

    // Fetch task status from Meshy
    const statusRes = await fetch(`${MESHY_BASE}/text-to-3d/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!statusRes.ok) {
      const errText = await statusRes.text();
      return NextResponse.json({ error: `Meshy status check failed: ${errText}` }, { status: 500 });
    }

    const task = await statusRes.json();

    // If task is complete and download requested, save the GLB file
    if (download && task.status === "SUCCEEDED" && task.model_urls?.glb) {
      const modelsDir = path.join(process.cwd(), "public", "models");
      await fs.mkdir(modelsDir, { recursive: true });

      const fileName = `human-${gender}.glb`;
      const filePath = path.join(modelsDir, fileName);

      // Download the GLB file from Meshy
      const glbRes = await fetch(task.model_urls.glb);
      if (!glbRes.ok) {
        return NextResponse.json({ error: "Failed to download GLB from Meshy" }, { status: 500 });
      }

      const arrayBuffer = await glbRes.arrayBuffer();
      await fs.writeFile(filePath, new Uint8Array(arrayBuffer));

      return NextResponse.json({
        status: "SAVED",
        fileName,
        filePath: `/models/${fileName}`,
        size: arrayBuffer.byteLength,
        message: `Model saved as ${fileName}. Refresh the body assessment page to see it.`,
      });
    }

    return NextResponse.json({
      taskId: task.id,
      status: task.status,
      progress: task.progress || 0,
      modelUrls: task.model_urls || null,
      thumbnailUrl: task.thumbnail_url || null,
      textureUrls: task.texture_urls || null,
      createdAt: task.created_at,
      finishedAt: task.finished_at,
    });
  } catch (err: any) {
    console.error("[meshy] Status error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
