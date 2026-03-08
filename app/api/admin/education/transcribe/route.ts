import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getConfigValue } from "@/lib/system-config";

export const dynamic = "force-dynamic";

// POST — Transcribe audio using Gemini
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { audio, mimeType, language } = body;

    if (!audio) {
      return NextResponse.json({ error: "No audio data provided" }, { status: 400 });
    }

    const geminiKey = await getConfigValue("GEMINI_API_KEY");
    if (!geminiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured. Go to Admin → API & AI Settings." }, { status: 500 });
    }

    const transcript = await transcribeWithGemini(geminiKey, audio, mimeType || "audio/webm", language || "en");
    if (transcript) {
      return NextResponse.json({ transcript, provider: "gemini" });
    }

    return NextResponse.json({ error: "Transcription returned empty. Please try again." }, { status: 500 });
  } catch (err: any) {
    console.error("[transcribe] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── Gemini Multimodal Transcription ───
async function transcribeWithGemini(apiKey: string, audioBase64: string, mimeType: string, language: string): Promise<string | null> {
  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const langInstruction = language === "pt"
    ? "The audio is in Portuguese (Brazil). Transcribe exactly what is spoken in Portuguese."
    : "The audio is in English. Transcribe exactly what is spoken in English.";

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: audioBase64,
              },
            },
            {
              text: `Transcribe this audio accurately. ${langInstruction} Return ONLY the transcribed text, nothing else. No explanations, no formatting, just the spoken words.`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini transcription failed (${response.status}): ${errText.substring(0, 300)}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text?.trim() || null;
}

