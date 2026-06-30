import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getConfigValue } from "@/lib/system-config";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const TRIPO_BASE = "https://api.tripo3d.ai/v2/openapi";

// POST — Create a text-to-3D task via Tripo3D
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = await getConfigValue("TRIPO_API_KEY");
    if (!apiKey) {
      return NextResponse.json({
        error: "Tripo3D API key not configured. Go to Settings → API Keys and add your TRIPO_API_KEY (free at tripo3d.ai).",
      }, { status: 400 });
    }

    const body = await req.json();
    const { prompt, gender } = body;

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    // Create text-to-3D task via Tripo3D
    const createRes = await fetch(`${TRIPO_BASE}/task`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "text_to_model",
        prompt,
        model_version: "v2.5",
        face_limit: 30000,
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("[tripo3d] Create task failed:", createRes.status, errText);
      return NextResponse.json({ error: `Tripo3D API error: ${createRes.status} - ${errText}` }, { status: 500 });
    }

    const resData = await createRes.json();
    const taskId = resData.data?.task_id;

    if (!taskId) {
      console.error("[tripo3d] No task_id in response:", resData);
      return NextResponse.json({ error: "Tripo3D did not return a task_id" }, { status: 500 });
    }

    return NextResponse.json({
      taskId,
      gender: gender || "male",
      message: "3D model generation started. Poll status with GET /api/admin/body-models/generate?taskId=...",
    });
  } catch (err: any) {
    console.error("[tripo3d] Error:", err);
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

    const apiKey = await getConfigValue("TRIPO_API_KEY");
    if (!apiKey) {
      return NextResponse.json({ error: "Tripo3D API key not configured" }, { status: 400 });
    }

    const taskId = req.nextUrl.searchParams.get("taskId");
    const download = req.nextUrl.searchParams.get("download") === "true";
    const gender = req.nextUrl.searchParams.get("gender") || "male";

    if (!taskId) {
      return NextResponse.json({ error: "taskId required" }, { status: 400 });
    }

    // Fetch task status from Tripo3D
    const statusRes = await fetch(`${TRIPO_BASE}/task/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!statusRes.ok) {
      const errText = await statusRes.text();
      return NextResponse.json({ error: `Tripo3D status check failed: ${errText}` }, { status: 500 });
    }

    const resData = await statusRes.json();
    const task = resData.data || {};

    // Normalize status: Tripo uses "success"/"running"/"queued"/"failed"
    // We map to the same statuses the frontend expects
    const statusMap: Record<string, string> = {
      success: "SUCCEEDED",
      running: "RUNNING",
      queued: "PENDING",
      failed: "FAILED",
    };
    const normalizedStatus = statusMap[task.status] || task.status?.toUpperCase() || "UNKNOWN";

    const glbUrl = task.output?.model || task.output?.pbr_model || null;
    const thumbnailUrl = task.output?.rendered_image || null;

    // If task is complete and download requested, save the GLB file
    if (download && normalizedStatus === "SUCCEEDED" && glbUrl) {
      const modelsDir = path.join(process.cwd(), "public", "models");
      await fs.mkdir(modelsDir, { recursive: true });

      const fileName = `human-${gender}.glb`;
      const filePath = path.join(modelsDir, fileName);

      // Download the GLB file from Tripo3D
      const glbRes = await fetch(glbUrl);
      if (!glbRes.ok) {
        return NextResponse.json({ error: "Failed to download GLB from Tripo3D" }, { status: 500 });
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
      taskId: task.task_id || taskId,
      status: normalizedStatus,
      progress: task.progress || (normalizedStatus === "SUCCEEDED" ? 100 : normalizedStatus === "RUNNING" ? 50 : 0),
      modelUrls: glbUrl ? { glb: glbUrl } : null,
      thumbnailUrl,
      createdAt: task.create_time,
      finishedAt: normalizedStatus === "SUCCEEDED" ? task.create_time : null,
    });
  } catch (err: any) {
    console.error("[tripo3d] Status error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
