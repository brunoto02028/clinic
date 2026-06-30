import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStudyUserId } from "@/lib/study-auth";
import { extractDocumentText, isImageMime } from "@/lib/extract-text";
import { analyzeImage } from "@/lib/ai-provider";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

// Re-run text extraction on an already-uploaded document (e.g. after a parser
// improvement or for files that previously failed). Reads the stored file back
// from disk — no re-upload needed.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getStudyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await prisma.studyDocument.findUnique({
    where: { id: params.id },
    include: { project: { select: { ownerId: true } } },
  });
  if (!doc || doc.project.ownerId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const uploadsBase = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
  const filePath = path.join(uploadsBase, "study", doc.projectId, doc.fileName);

  let buffer: Buffer;
  try {
    buffer = await readFile(filePath);
  } catch {
    return NextResponse.json({ error: "The original file is no longer on the server — please re-upload it." }, { status: 410 });
  }

  let extractedText: string | null = null;
  let status = "done";
  let extractError: string | null = null;
  try {
    if (isImageMime(doc.mimeType)) {
      const dataUrl = `data:${doc.mimeType};base64,${buffer.toString("base64")}`;
      extractedText = await analyzeImage(
        dataUrl,
        "Transcribe ALL text visible in this image exactly as written. This is a study/assessment document. Preserve headings, bullet points, numbering and structure. Output only the transcribed text.",
        { maxTokens: 4096, temperature: 0 }
      );
    } else {
      extractedText = await extractDocumentText(buffer, doc.mimeType, doc.originalName);
      if (extractedText === null) { status = "failed"; extractError = "Unsupported file type for text extraction"; }
    }
    if (extractedText && !extractedText.trim()) { status = "failed"; extractError = "No readable text found in the file"; }
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

// Delete a study document (verifies ownership through its project)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getStudyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await prisma.studyDocument.findUnique({
    where: { id: params.id },
    include: { project: { select: { ownerId: true } } },
  });
  if (!doc || doc.project.ownerId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.studyDocument.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
