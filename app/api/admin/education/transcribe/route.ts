import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getConfigValue } from "@/lib/system-config";

export const dynamic = "force-dynamic";

// POST — Transcribe audio using Gemini or Abacus (paid APIs)
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

    // Try Gemini first (multimodal — accepts audio natively)
    const geminiKey = await getConfigValue("GEMINI_API_KEY");
    if (geminiKey) {
      try {
        const transcript = await transcribeWithGemini(geminiKey, audio, mimeType || "audio/webm", language || "en");
        if (transcript) {
          return NextResponse.json({ transcript, provider: "gemini" });
        }
      } catch (err: any) {
        console.error("[transcribe] Gemini failed:", err.message);
      }
    }

    // Fallback: Abacus (OpenAI-compatible whisper endpoint)
    const abacusKey = await getConfigValue("ABACUS_API_KEY");
    if (abacusKey) {
      try {
        const transcript = await transcribeWithAbacus(abacusKey, audio, mimeType || "audio/webm", language || "en");
        if (transcript) {
          return NextResponse.json({ transcript, provider: "abacus" });
        }
      } catch (err: any) {
        console.error("[transcribe] Abacus failed:", err.message);
      }
    }

    return NextResponse.json({ error: "No AI transcription service available. Check your API keys in Admin → Settings." }, { status: 500 });
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

// ─── Abacus (OpenAI-compatible) Transcription ───
async function transcribeWithAbacus(apiKey: string, audioBase64: string, mimeType: string, language: string): Promise<string | null> {
  // Convert base64 to ArrayBuffer for Blob
  const raw = atob(audioBase64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

  // Determine file extension from mime type
  const ext = mimeType.includes("webm") ? "webm" : mimeType.includes("mp4") ? "mp4" : mimeType.includes("wav") ? "wav" : "webm";

  const formData = new FormData();
  const audioBlob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType });
  formData.append("file", audioBlob, `recording.${ext}`);
  formData.append("model", "whisper-large-v3");
  formData.append("language", language === "pt" ? "pt" : "en");

  const response = await fetch("https://routellm.abacus.ai/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Abacus transcription failed (${response.status}): ${errText.substring(0, 300)}`);
  }

  const data = await response.json();
  return data?.text?.trim() || null;
}
