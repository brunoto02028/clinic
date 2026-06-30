import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStudyUserId } from "@/lib/study-auth";
import { extractDocumentText, isImageMime } from "@/lib/extract-text";
import { analyzeImage } from "@/lib/ai-provider";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const MAX_SIZE = 20 * 1024 * 1024; // 20MB

// Upload a document to a study project and extract its text
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getStudyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await prisma.studyProject.findFirst({ where: { id: params.id, ownerId: userId }, select: { id: true } });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const kind = (form.get("kind") as string) || "brief";
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "application/octet-stream";

  // Save to persistent storage (Railway Volume or local public/uploads)
  const uploadsBase = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
  const dir = path.join(uploadsBase, "study", params.id);
  await mkdir(dir, { recursive: true });
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const uniqueName = `${Date.now()}-${safeName}`;
  const filePath = path.join(dir, uniqueName);
  await writeFile(filePath, buffer);
  const fileUrl = `/uploads/study/${params.id}/${uniqueName}`;

  // Create the document record first (so the UI can show it immediately)
  const doc = await prisma.studyDocument.create({
    data: {
      projectId: params.id,
      fileName: uniqueName,
      originalName: file.name,
      mimeType: mime,
      fileSize: file.size,
      fileUrl,
      kind,
      extractStatus: "pending",
    },
  });

  // Extract text (synchronously — files are small)
  let extractedText: string | null = null;
  let status = "done";
  let extractError: string | null = null;
  try {
    if (isImageMime(mime)) {
      const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;
      extractedText = await analyzeImage(
        dataUrl,
        "Transcribe ALL text visible in this image exactly as written. This is a study/assessment document. Preserve headings, bullet points, numbering and structure. Output only the transcribed text.",
        { maxTokens: 4096, temperature: 0 }
      );
    } else {
      extractedText = await extractDocumentText(buffer, mime, file.name);
      if (extractedText === null) {
        status = "failed";
        extractError = "Unsupported file type for text extraction";
      }
    }
    if (extractedText && !extractedText.trim()) {
      status = "failed";
      extractError = "No readable text found in the file";
    }
  } catch (err: any) {
    status = "failed";
    extractError = err.message?.slice(0, 300) || "Extraction failed";
  }

  const updated = await prisma.studyDocument.update({
    where: { id: doc.id },
    data: { extractedText: extractedText || null, extractStatus: status, extractError },
  });

  return NextResponse.json({ document: updated });
}
