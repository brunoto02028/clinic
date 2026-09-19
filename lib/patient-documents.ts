import { prisma } from "@/lib/db";

/**
 * One path for storing a patient file.
 *
 * The bytes go in the database, base64, not on disk. Two findings forced this:
 * a bare curl with no session fetched a patient document straight from
 * /uploads/ (Next serves public/ statically, before any code runs), and
 * nothing on the VPS disk is captured by any backup. In the database, access
 * has to come through /api/files/[id] — which checks who is asking — and the
 * nightly prod-db.sql automatically carries every document.
 *
 * The same rules previously lived, slightly differently, in three routes.
 */

export {
  DOCUMENT_ALLOWED_TYPES,
  DOCUMENT_MAX_BYTES,
  validatePatientFile,
} from "@/lib/patient-documents-shared";

export interface StorePatientDocumentInput {
  file: File;
  clinicId: string;
  patientId: string;
  uploadedById: string;
  documentType?: string;
  source?: string;
  title?: string | null;
  description?: string | null;
  doctorName?: string | null;
  documentDate?: Date | null;
}

export async function storePatientDocument(input: StorePatientDocumentInput) {
  const { file, ...meta } = input;

  const bytes = Buffer.from(await file.arrayBuffer());

  // Row first, then the URL: the URL contains the row's own id.
  const doc = await (prisma as any).patientDocument.create({
    data: {
      clinicId: meta.clinicId,
      patientId: meta.patientId,
      uploadedById: meta.uploadedById,
      fileName: file.name,
      fileUrl: "",
      fileType: file.type,
      fileSize: file.size,
      fileData: bytes.toString("base64"),
      documentType: meta.documentType || "OTHER",
      source: meta.source || "ADMIN_UPLOAD",
      title: meta.title ?? file.name,
      description: meta.description ?? null,
      doctorName: meta.doctorName ?? null,
      documentDate: meta.documentDate ?? null,
    },
  });

  const fileUrl = `/api/files/${doc.id}`;
  return (prisma as any).patientDocument.update({
    where: { id: doc.id },
    data: {
      fileUrl,
      // Images preview with the file itself; nothing renders a PDF thumbnail.
      thumbnailUrl: file.type.startsWith("image/") ? fileUrl : null,
    },
    include: {
      uploadedBy: { select: { firstName: true, lastName: true, role: true } },
    },
  });
}
