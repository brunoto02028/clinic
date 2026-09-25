import { prisma } from "@/lib/db";
import { sniffSubmissionType } from "@/lib/exercise-submission";
import { notifyNewClinicalDocument } from "@/lib/evidence-report";

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

  // O rótulo já foi conferido por quem chamou; aqui quem responde são os bytes.
  // Um `.exe` renomeado para `.pdf` declarava `application/pdf`, era aceito, e
  // depois servido de volta com `Content-Type: application/pdf` para quem
  // abrisse (QA de 25/09, achado A7).
  //
  // A regra não é "o rótulo tem que bater": navegador e celular erram o rótulo
  // com frequência (`image/jpg`, `application/octet-stream`), e recusar um
  // arquivo legítimo é pior que o problema. A regra é **o conteúdo tem que ser
  // aceitável**. Word, TXT e CSV não têm assinatura confiável e seguem pelo
  // rótulo — nenhum deles executa ao abrir.
  const tipoReal = sniffSubmissionType(bytes);
  const conteudoReconhecido = !!tipoReal;
  const conteudoAceitavel =
    tipoReal && (tipoReal.startsWith("image/") || DOCUMENT_ALLOWED_TYPES.includes(tipoReal));
  const rotuloExigeAssinatura =
    file.type.startsWith("image/") || file.type === "application/pdf";

  if ((conteudoReconhecido && !conteudoAceitavel) || (!conteudoReconhecido && rotuloExigeAssinatura)) {
    throw Object.assign(new Error("That file is not what it says it is."), {
      code: "type_mismatch",
    });
  }

  // Row first, then the URL: the URL contains the row's own id.
  const doc = await (prisma as any).patientDocument.create({
    data: {
      clinicId: meta.clinicId,
      patientId: meta.patientId,
      uploadedById: meta.uploadedById,
      fileName: file.name,
      fileUrl: "",
      // O tipo que o arquivo **é**, quando dá para saber. Era o que o cliente
      // disse, e é com ele que a rota de download responde depois.
      fileType: tipoReal || file.type,
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
  const updated = await (prisma as any).patientDocument.update({
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

  // Every upload path (patient portal, admin, AI Import) goes through this
  // one function — the single place to keep the evidence report current as
  // exams trickle in over days (activity 066 T-1). Awaited (it's a couple of
  // fast Prisma calls, no AI/extraction here — that's deferred to the
  // background job) — `notifyNewClinicalDocument` itself never throws, so
  // this can never fail the upload.
  await notifyNewClinicalDocument(meta.patientId, updated.documentType);

  return updated;
}
