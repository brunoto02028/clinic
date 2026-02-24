import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { analyzeSummary, analyzeKeywords, analyzeEntities } from "@/lib/docling";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const type = (formData.get("type") as string) || "summary";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    let result;
    switch (type) {
      case "keywords": result = await analyzeKeywords(file, file.name); break;
      case "entities": result = await analyzeEntities(file, file.name); break;
      default: result = await analyzeSummary(file, file.name); break;
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[DOCLING] Analyze error:", error?.message);
    return NextResponse.json({ error: error?.message || "Analysis failed" }, { status: 500 });
  }
}
