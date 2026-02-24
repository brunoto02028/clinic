import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { listDocuments } from "@/lib/docling";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const data = await listDocuments(page, limit);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[DOCLING] List documents error:", error?.message);
    return NextResponse.json({ error: error?.message || "Failed to list documents" }, { status: 500 });
  }
}
