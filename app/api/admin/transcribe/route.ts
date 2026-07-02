import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const CHUNK_SIZE_MB = 20; // Groq Whisper limit is 25MB — use 20MB per chunk to be safe

/**
 * POST /api/admin/transcribe
 * Accepts audio or video file (multipart/form-data).
 * Files > 20MB are split into chunks via Groq Whisper API.
 * Returns full transcript text.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const lang = (formData.get("lang") as string) || "pt";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const ALLOWED = [
      "audio/mpeg", "audio/mp4", "audio/wav", "audio/webm", "audio/ogg",
      "audio/m4a", "audio/flac", "audio/aac",
      "video/mp4", "video/webm", "video/mpeg", "video/quicktime",
    ];
    const type = file.type || "audio/mpeg";
    if (!ALLOWED.some(a => type.startsWith(a.split("/")[0]))) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    // Max 500MB total
    if (file.size > 500 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 500MB)" }, { status: 400 });
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
    }

    const tmpDir = path.join(process.cwd(), "tmp", "transcribe");
    await mkdir(tmpDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const uint8 = new Uint8Array(bytes);
    const ext = file.name.split(".").pop() || "mp3";
    const tmpFile = path.join(tmpDir, `upload-${Date.now()}.${ext}`);
    await writeFile(tmpFile, uint8);

    let transcript = "";

    // If file is small enough, transcribe directly
    if (file.size <= CHUNK_SIZE_MB * 1024 * 1024) {
      transcript = await transcribeWithGroq(tmpFile, file.name, lang, type);
    } else {
      // Large file: split into time-based chunks using fetch streaming
      // Strategy: split buffer into raw byte chunks and transcribe each
      // Note: For best results with long files, we split at CHUNK_SIZE_MB byte boundaries
      const chunkSize = CHUNK_SIZE_MB * 1024 * 1024;
      const chunks = Math.ceil(uint8.length / chunkSize);
      const parts: string[] = [];

      for (let i = 0; i < chunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, uint8.length);
        const chunkBuffer = uint8.slice(start, end);
        const chunkFile = path.join(tmpDir, `chunk-${Date.now()}-${i}.${ext}`);
        await writeFile(chunkFile, chunkBuffer);

        try {
          const part = await transcribeWithGroq(chunkFile, `chunk-${i}.${ext}`, lang, type);
          parts.push(part);
        } catch (e: any) {
          parts.push(`[Chunk ${i + 1} error: ${e.message}]`);
        } finally {
          try { await unlink(chunkFile); } catch { /* ignore */ }
        }
      }

      transcript = parts.join(" ").trim();
    }

    // Cleanup temp file
    try { await unlink(tmpFile); } catch { /* ignore */ }

    return NextResponse.json({ success: true, transcript, length: transcript.length });
  } catch (err: any) {
    console.error("[transcribe]", err);
    return NextResponse.json({ error: err.message || "Transcription failed" }, { status: 500 });
  }
}

async function transcribeWithGroq(filePath: string, fileName: string, lang: string, mimeType: string): Promise<string> {
  const { readFileSync } = await import("fs");

  const form = new FormData();
  const fileData = readFileSync(filePath);
  // Convert to ArrayBuffer to avoid SharedArrayBuffer Blob typing issue
  const ab = fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength) as ArrayBuffer;
  const blob = new Blob([ab], { type: mimeType });
  form.append("file", blob, fileName);
  form.append("model", "whisper-large-v3");
  form.append("language", lang);
  form.append("response_format", "text");
  form.append("temperature", "0");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${GROQ_API_KEY}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq Whisper error: ${err}`);
  }

  const text = await res.text();
  return text.trim();
}
