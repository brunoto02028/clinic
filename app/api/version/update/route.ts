export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST() {
  try {
    const versionPath = path.join(process.cwd(), "public", "version.json");
    const newVersion = {
      version: `1.0.${Date.now()}`,
      timestamp: Date.now(),
      buildDate: new Date().toISOString(),
    };
    
    fs.writeFileSync(versionPath, JSON.stringify(newVersion, null, 2));
    
    return NextResponse.json({ success: true, version: newVersion });
  } catch (error) {
    console.error("Error updating version:", error);
    return NextResponse.json(
      { error: "Failed to update version" },
      { status: 500 }
    );
  }
}
