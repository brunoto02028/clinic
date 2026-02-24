import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { extractText, extractTables, extractMetadata, extractStructure } from "@/lib/docling";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const type = (formData.get("type") as string) || "text";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    let result;
    switch (type) {
      case "tables": result = await extractTables(file, file.name); break;
      case "metadata": result = await extractMetadata(file, file.name); break;
      case "structure": result = await extractStructure(file, file.name); break;
      default: result = await extractText(file, file.name); break;
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[DOCLING] Extract error:", error?.message);
    return NextResponse.json({ error: error?.message || "Extraction failed" }, { status: 500 });
  }
}
