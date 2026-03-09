import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const MODELS_DIR = process.env.MODELS_DIR || path.join(process.cwd(), "public", "models");

// GET /api/sketchfab/model/[uid] — Serve cached GLB file via stream
export async function GET(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  const uid = params.uid.replace(/\.glb$/i, "");
  const glbPath = path.join(MODELS_DIR, `${uid}.glb`);

  if (!fs.existsSync(glbPath)) {
    return NextResponse.json({ error: "Model not found" }, { status: 404 });
  }

  const stat = fs.statSync(glbPath);

  // Stream the file instead of loading entirely into memory
  const nodeStream = fs.createReadStream(glbPath);
  const webStream = new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });
      nodeStream.on("end", () => {
        controller.close();
      });
      nodeStream.on("error", (err) => {
        controller.error(err);
      });
    },
    cancel() {
      nodeStream.destroy();
    },
  });

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": "model/gltf-binary",
      "Content-Length": stat.size.toString(),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
