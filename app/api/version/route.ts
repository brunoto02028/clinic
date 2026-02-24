import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// This endpoint returns the current build version
// The version is determined by checking multiple sources
export async function GET() {
  try {
    let version = "unknown";
    let timestamp = 0;

    // Method 1: Try to read the version.json file
    const versionPath = path.join(process.cwd(), "public", "version.json");
    if (fs.existsSync(versionPath)) {
      try {
        const versionData = JSON.parse(fs.readFileSync(versionPath, "utf-8"));
        version = versionData.version;
        timestamp = versionData.timestamp;
      } catch (e) {
        // Continue to next method
      }
    }

    // Method 2: Check Next.js build manifest timestamp
    const buildManifestPaths = [
      path.join(process.cwd(), ".build", "build-manifest.json"),
      path.join(process.cwd(), ".next", "build-manifest.json"),
    ];

    for (const manifestPath of buildManifestPaths) {
      if (fs.existsSync(manifestPath)) {
        const stats = fs.statSync(manifestPath);
        const manifestTimestamp = stats.mtimeMs;
        
        // Use the more recent timestamp
        if (manifestTimestamp > timestamp) {
          timestamp = Math.floor(manifestTimestamp);
          version = `build-${timestamp}`;
        }
        break;
      }
    }

    // Method 3: Check BUILD_ID file
    const buildIdPaths = [
      path.join(process.cwd(), ".build", "BUILD_ID"),
      path.join(process.cwd(), ".next", "BUILD_ID"),
    ];

    for (const buildIdPath of buildIdPaths) {
      if (fs.existsSync(buildIdPath)) {
        const buildId = fs.readFileSync(buildIdPath, "utf-8").trim();
        const stats = fs.statSync(buildIdPath);
        const buildTimestamp = Math.floor(stats.mtimeMs);
        
        if (buildTimestamp > timestamp) {
          version = buildId;
          timestamp = buildTimestamp;
        }
        break;
      }
    }

    // Fallback: use a hash of all source files modification time
    if (timestamp === 0) {
      timestamp = Date.now();
      version = `dev-${timestamp}`;
    }

    return NextResponse.json(
      { version, timestamp },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (error) {
    console.error("Error getting version:", error);
    return NextResponse.json(
      { version: "error", timestamp: Date.now() },
      { 
        status: 500,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  }
}
