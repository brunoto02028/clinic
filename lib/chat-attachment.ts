import { prisma } from "@/lib/db";
import { storePatientDocument, validatePatientFile } from "@/lib/patient-documents";

export interface SavedAttachment {
  fileUrl: string;
  fileName: string;
  fileType: string;
}

/**
 * Stores a chat attachment as a PatientDocument (source CHAT_UPLOAD) so it
 * also appears in the patient's Documents section. The bytes live in the
 * database and are served through /api/files/[id] with a session check —
 * they used to sit under public/uploads, where a bare URL fetched them with
 * no authentication at all.
 */
export async function saveChatAttachment(opts: {
  file: File;
  patientId: string;
  uploaderId: string;
}): Promise<SavedAttachment> {
  const { file, patientId, uploaderId } = opts;

  const invalid = validatePatientFile(file);
  if (invalid) throw new Error(invalid);

  const patient = await prisma.user.findUnique({ where: { id: patientId }, select: { clinicId: true } });
  if (!patient?.clinicId) throw new Error("Patient has no clinic");

  const doc = await storePatientDocument({
    file,
    clinicId: patient.clinicId,
    patientId,
    uploadedById: uploaderId,
    documentType: "OTHER",
    source: "CHAT_UPLOAD",
    title: file.name,
    description: "Sent via chat",
  });

  return { fileUrl: doc.fileUrl, fileName: file.name, fileType: file.type };
}
