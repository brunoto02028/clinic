import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getConfigValue } from "@/lib/system-config";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    const language = (formData.get("language") as string) || "en";

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // Try Groq Whisper first (fastest, best quality)
    const groqKey = (await getConfigValue("GROQ_API_KEY")) || process.env.GROQ_API_KEY;
    if (groqKey) {
      try {
        const groqFormData = new FormData();
        groqFormData.append("file", audioFile);
        groqFormData.append("model", "whisper-large-v3");
        groqFormData.append("language", language);
        groqFormData.append("temperature", "0");
        groqFormData.append("response_format", "verbose_json");

        const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${groqKey}` },
          body: groqFormData,
        });

        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({
            transcript: data.text,
            duration: data.duration,
            language: data.language,
            segments: data.segments,
            provider: "groq-whisper",
          });
        }
        console.warn("[clinical-scribe] Groq Whisper failed:", await res.text());
      } catch (err: any) {
        console.warn("[clinical-scribe] Groq Whisper error:", err.message);
      }
    }

    // In strict mode, do not fall back to Gemini for patient audio
    if (process.env.AI_STRICT_MODE === 'true') {
      return NextResponse.json({ error: "Transcription failed (strict mode). Groq Whisper unavailable, no fallback to Gemini." }, { status: 503 });
    }

    // Fallback to Gemini multimodal transcription (Minimax removed — GDPR: no patient audio to Minimax)
    const geminiKey = await getConfigValue("GEMINI_API_KEY");
    if (geminiKey) {
      const arrayBuffer = await audioFile.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const mimeType = audioFile.type || "audio/webm";

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
      const langPrompt = language === "pt"
        ? "Transcribe this audio exactly. The audio is in Portuguese (Brazil). Return ONLY the transcription, nothing else."
        : "Transcribe this audio exactly. The audio is in English. Return ONLY the transcription, nothing else.";

      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType, data: base64 } },
              { text: langPrompt },
            ],
          }],
          generationConfig: { temperature: 0 },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const transcript = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return NextResponse.json({ transcript, provider: "gemini" });
      }
    }

    return NextResponse.json({ error: "No transcription provider available. Configure GROQ_API_KEY or GEMINI_API_KEY." }, { status: 500 });
  } catch (error: any) {
    console.error("[clinical-scribe] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
