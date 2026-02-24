import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { parseExerciseFromVoice } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { transcript, language } = body;
    if (!transcript || typeof transcript !== "string" || transcript.trim().length < 3) {
      return NextResponse.json({ error: "Transcript is required (min 3 characters)" }, { status: 400 });
    }

    const outputLang: "en" | "pt" = language === "pt" ? "pt" : "en";

    const parsed = await parseExerciseFromVoice(transcript.trim(), outputLang);

    return NextResponse.json({ success: true, data: parsed, transcript: transcript.trim() });
  } catch (err: any) {
    console.error("[voice-parse] Error:", err?.message || err);
    return NextResponse.json(
      { error: err?.message || "Failed to parse voice input. Check GEMINI_API_KEY." },
      { status: 500 }
    );
  }
}
