import { apiFetch, apiUpload } from "./client";

/**
 * O vídeo que o paciente manda do exercício feito em casa.
 *
 * O envio é sempre preso a um exercício — é o que separa isto de mandar um
 * vídeo na conversa, onde em duas semanas ninguém sabe mais a que se referia.
 */

export interface ExerciseSubmission {
  id: string;
  kind: "VIDEO" | "PHOTO";
  mimeType: string;
  durationSeconds: number | null;
  submittedAt: string;
  /** Enquanto for nulo, o terapeuta ainda não viu. */
  reviewedAt: string | null;
  /** A correção. Pode vir vazia: "vi e está certo" também é resposta. */
  reviewNote: string | null;
  exercisePrescriptionId: string | null;
  protocolItemId: string | null;
}

export interface SubmissionList {
  submissions: ExerciseSubmission[];
  /** O limite de duração vem do servidor, para não divergir do que ele aceita. */
  maxDurationSeconds: number;
}

export async function fetchSubmissions(exercisePrescriptionId: string): Promise<SubmissionList> {
  return apiFetch<SubmissionList>(
    `/api/patient/exercise-submissions?exercisePrescriptionId=${encodeURIComponent(exercisePrescriptionId)}`
  );
}

export interface UploadInput {
  uri: string;
  name: string;
  mimeType: string;
  exercisePrescriptionId: string;
  durationSeconds?: number | null;
}

export async function uploadSubmission(input: UploadInput): Promise<ExerciseSubmission> {
  const form = new FormData();
  form.append("file", { uri: input.uri, name: input.name, type: input.mimeType } as any);
  form.append("exercisePrescriptionId", input.exercisePrescriptionId);
  if (input.durationSeconds != null) {
    form.append("durationSeconds", String(Math.round(input.durationSeconds)));
  }
  const body = await apiUpload<{ submission: ExerciseSubmission }>(
    "/api/patient/exercise-submissions",
    form
  );
  return body.submission;
}

export async function deleteSubmission(id: string): Promise<void> {
  await apiFetch(`/api/patient/exercise-submissions/${id}`, { method: "DELETE" });
}
