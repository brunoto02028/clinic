import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { ocrExtract } from "@/lib/docling";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const result = await ocrExtract(file, file.name);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[DOCLING] OCR error:", error?.message);
    return NextResponse.json({ error: error?.message || "OCR failed" }, { status: 500 });
  }
}
