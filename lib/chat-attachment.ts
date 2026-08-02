import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const DOC_ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain", "text/csv",
];

export interface SavedAttachment {
  fileUrl: string;
  fileName: string;
  fileType: string;
}

/**
 * Saves a chat attachment to disk and registers it as a PatientDocument
 * (source CHAT_UPLOAD) so it also appears in the patient's Documents section.
 * Returns the attachment info to store on the message, or throws on invalid file.
 */
export async function saveChatAttachment(opts: {
  file: File;
  patientId: string;
  uploaderId: string;
}): Promise<SavedAttachment> {
  const { file, patientId, uploaderId } = opts;

  if (!file.type.startsWith("image/") && !DOC_ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Invalid file type. Allowed: images, PDF, Word, TXT, CSV");
  }
  if (file.size > 25 * 1024 * 1024) {
    throw new Error("File too large (max 25MB)");
  }

  const uploadsBase = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
  const uploadDir = path.join(uploadsBase, "documents", patientId);
  await mkdir(uploadDir, { recursive: true });

  const ext = path.extname(file.name) || (file.type === "application/pdf" ? ".pdf" : ".jpg");
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").replace(ext, "");
  const uniqueName = `${Date.now()}-${safeName}${ext}`;
  await writeFile(path.join(uploadDir, uniqueName), new Uint8Array(await file.arrayBuffer()));

  const fileUrl = `/uploads/documents/${patientId}/${uniqueName}`;

  // Register in Documents (single source of truth) — needs the patient's clinic
  try {
    const patient = await prisma.user.findUnique({ where: { id: patientId }, select: { clinicId: true } });
    if (patient?.clinicId) {
      await (prisma as any).patientDocument.create({
        data: {
          clinicId: patient.clinicId,
          patientId,
          uploadedById: uploaderId,
          fileName: file.name,
          fileUrl,
          fileType: file.type,
          fileSize: file.size,
          thumbnailUrl: file.type.startsWith("image/") ? fileUrl : null,
          documentType: "OTHER",
          source: "CHAT_UPLOAD",
          title: file.name,
          description: "Sent via chat",
        },
      });
    }
  } catch (e) {
    console.error("[chat-attachment] Failed to register document:", e);
  }

  return { fileUrl, fileName: file.name, fileType: file.type };
}
