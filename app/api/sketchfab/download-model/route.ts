import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SKETCHFAB_API = "https://api.sketchfab.com/v3";
// Store outside public/ so deploys don't wipe cached models
const MODELS_DIR = process.env.MODELS_DIR || path.join(process.cwd(), "public", "models");
const DEFAULT_MODEL_UID = "faf0f3eaec554bcf854be2038993024f";

// GET /api/sketchfab/download-model?uid=xxx
// Downloads a Sketchfab model as GLB zip, extracts, and caches locally
export async function GET(request: NextRequest) {
  const uid = request.nextUrl.searchParams.get("uid") || DEFAULT_MODEL_UID;
  const token = process.env.SKETCHFAB_API_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "SKETCHFAB_API_TOKEN not configured" },
      { status: 500 }
    );
  }

  // Check if already cached
  const cachedGlb = path.join(MODELS_DIR, `${uid}.glb`);
  if (fs.existsSync(cachedGlb)) {
    return NextResponse.json({
      success: true,
      cached: true,
      modelUrl: `/models/${uid}.glb`,
      uid,
    });
  }

  try {
    // Step 1: Request download URL from Sketchfab
    const downloadRes = await fetch(`${SKETCHFAB_API}/models/${uid}/download`, {
      headers: {
        Authorization: `Token ${token}`,
      },
    });

    if (!downloadRes.ok) {
      const errText = await downloadRes.text();
      console.error("[Sketchfab] Download request failed:", downloadRes.status, errText);
      return NextResponse.json(
        {
          error: `Sketchfab API error: ${downloadRes.status}`,
          detail: errText,
        },
        { status: downloadRes.status }
      );
    }

    const downloadData = await downloadRes.json();

    // The response contains gltf.url (ZIP archive) and optionally glb.url
    let archiveUrl: string | null = null;
    let isGlb = false;

    // Prefer GLB if available (single file, no extraction needed)
    if (downloadData.glb?.url) {
      archiveUrl = downloadData.glb.url;
      isGlb = true;
    } else if (downloadData.gltf?.url) {
      archiveUrl = downloadData.gltf.url;
      isGlb = false;
    }

    if (!archiveUrl) {
      return NextResponse.json(
        { error: "No download URL available for this model" },
        { status: 404 }
      );
    }

    // Step 2: Download the archive/file
    const fileRes = await fetch(archiveUrl);
    if (!fileRes.ok) {
      return NextResponse.json(
        { error: "Failed to download model file" },
        { status: 502 }
      );
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ensure models directory exists
    if (!fs.existsSync(MODELS_DIR)) {
      fs.mkdirSync(MODELS_DIR, { recursive: true });
    }

    if (isGlb) {
      // GLB is a single binary file — save directly
      fs.writeFileSync(cachedGlb, buffer);
    } else {
      // glTF comes as a ZIP archive — we need to extract
      // For ZIP handling, use the built-in zlib + a simple unzip approach
      // Save the zip first, then try to find the .glb or .gltf inside
      const zipPath = path.join(MODELS_DIR, `${uid}.zip`);
      fs.writeFileSync(zipPath, buffer);

      // Use Node.js built-in to extract — try with AdmZip pattern
      try {
        const AdmZip = (await import("adm-zip")).default;
        const zip = new AdmZip(zipPath);
        const entries = zip.getEntries();

        // Look for .glb file first
        const glbEntry = entries.find((e: any) =>
          e.entryName.toLowerCase().endsWith(".glb")
        );

        if (glbEntry) {
          fs.writeFileSync(cachedGlb, glbEntry.getData());
        } else {
          // If no GLB, extract all to a folder and we'll serve the gltf
          const extractDir = path.join(MODELS_DIR, uid);
          zip.extractAllTo(extractDir, true);

          // Find scene.gltf
          const gltfFile = entries.find(
            (e: any) =>
              e.entryName.toLowerCase().endsWith(".gltf") ||
              e.entryName.toLowerCase() === "scene.gltf"
          );

          if (gltfFile) {
            // Return path to gltf folder
            return NextResponse.json({
              success: true,
              cached: true,
              modelUrl: `/models/${uid}/${gltfFile.entryName}`,
              format: "gltf",
              uid,
            });
          }
        }

        // Cleanup zip
        fs.unlinkSync(zipPath);
      } catch (zipErr) {
        console.error("[Sketchfab] ZIP extraction failed:", zipErr);
        // Cleanup
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        return NextResponse.json(
          { error: "Failed to extract model archive. Install adm-zip: npm i adm-zip" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      cached: false,
      modelUrl: `/models/${uid}.glb`,
      uid,
    });
  } catch (err: any) {
    console.error("[Sketchfab] Error:", err);
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
