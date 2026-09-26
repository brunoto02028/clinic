import { prisma } from "@/lib/db";
import { isR2Configured, uploadToR2, deleteFromR2, getR2ObjectStream } from "@/lib/r2";

/**
 * O vídeo — ou a foto — que o paciente manda do exercício feito em casa.
 *
 * No atendimento híbrido ninguém vê a execução, e o terapeuta acaba corrigindo
 * o que não viu. Um envio existe para fechar esse buraco, e por isso ele é
 * preso a **um exercício**: vídeo solto numa conversa vira, em duas semanas,
 * uma pilha sem contexto.
 *
 * **O arquivo fica no R2 e o que se guarda é a chave, nunca a URL.** O R2 serve
 * por URL pública, e isto é um paciente fazendo fisioterapia dentro de casa —
 * dado de saúde. Quem decide quem vê é a rota autenticada, não quem tiver o
 * endereço.
 */

/** Um minuto, a duração que o Bruno definiu em 25/09/2026. */
export const MAX_DURATION_SECONDS = 60;

/**
 * O teto de bytes é rede de proteção, não o limite de verdade.
 *
 * O limite que o paciente vive é o de **tempo**, imposto pelo próprio gravador
 * do celular: "grave até 1 minuto" é instrução, "arquivo muito grande" é erro
 * depois do esforço. Isto aqui existe para o vídeo escolhido da galeria, que
 * não passou pelo gravador. 1 minuto de 1080p cabe folgado em 200 MB.
 */
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

const VIDEO_EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
};
const PHOTO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
};

export type SubmissionKind = "VIDEO" | "PHOTO";

export interface SubmissionRefusal {
  code: "unsupported_type" | "too_large" | "too_long" | "storage_unconfigured";
  message: string;
}

/** Por que este arquivo não serve — ou `null` quando serve. */
export function refuseSubmission(file: { type: string; size: number }, durationSeconds?: number | null): SubmissionRefusal | null {
  const type = (file.type || "").toLowerCase();
  const isVideo = !!VIDEO_EXT[type];
  const isPhoto = !!PHOTO_EXT[type];

  if (!isVideo && !isPhoto) {
    return { code: "unsupported_type", message: "Send a video (MP4 or MOV) or a photo (JPEG, PNG, HEIC)." };
  }
  if (isVideo && durationSeconds != null && durationSeconds > MAX_DURATION_SECONDS) {
    return { code: "too_long", message: `Videos can be up to ${MAX_DURATION_SECONDS} seconds.` };
  }
  const teto = isVideo ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES;
  if (file.size > teto) {
    return { code: "too_large", message: isVideo ? "That video is too large." : "That photo is too large." };
  }
  return null;
}

/**
 * O tipo de verdade, lido dos primeiros bytes.
 *
 * `file.type` é o que o cliente **declarou** no multipart. Um `.exe` renomeado
 * para `.mp4` declarava `video/mp4`, passava pela recusa e era guardado como
 * vídeo do paciente — servido depois com `Content-Type: video/mp4` para quem
 * abrisse. Quem responde agora são os bytes.
 *
 * Devolve `null` quando não reconhece nada — e não reconhecer é motivo de
 * recusa, não de aceitar na dúvida.
 */
export function sniffSubmissionType(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;

  // PDF, para o anexo de conversa poder usar o mesmo juiz (achado A7 do QA de
  // 25/09: um `.exe` renomeado para `.pdf` era aceito e devolvido rotulado
  // como PDF, porque a validacao lia o rotulo do cliente).
  if (buffer.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }

  // MP4, MOV e HEIC são todos caixas ISO-BMFF: o que os separa é a marca logo
  // depois do `ftyp`.
  if (buffer.subarray(4, 8).toString("latin1") === "ftyp") {
    const marca = buffer.subarray(8, 12).toString("latin1").toLowerCase();
    if (marca === "qt  ") return "video/quicktime";
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(marca)) return "image/heic";
    // `M4A ` é a marca de áudio da mesma caixa. Sem esta linha um recado de
    // voz é farejado como `video/mp4` — e aí ou ele é recusado como anexo, ou
    // passa por vídeo de exercício. Os dois errados (089).
    if (["m4a ", "m4b ", "mp4a"].includes(marca)) return "audio/mp4";
    return "video/mp4";
  }

  return null;
}

export function kindOf(mimeType: string): SubmissionKind {
  return VIDEO_EXT[(mimeType || "").toLowerCase()] ? "VIDEO" : "PHOTO";
}

function extensionOf(mimeType: string): string {
  const t = (mimeType || "").toLowerCase();
  return VIDEO_EXT[t] ?? PHOTO_EXT[t] ?? "bin";
}

export interface StoreSubmissionInput {
  file: File;
  patientId: string;
  clinicId: string;
  exercisePrescriptionId?: string | null;
  protocolItemId?: string | null;
  durationSeconds?: number | null;
}

/**
 * Guarda o arquivo e registra o envio.
 *
 * A ordem importa: o arquivo sobe primeiro porque precisa de uma chave, e se o
 * registro falhar o objeto é removido. Sem isso ficaria um vídeo de paciente no
 * armazenamento que nenhuma linha referencia e ninguém sabe apagar — o mesmo
 * cuidado que a foto de perfil já toma.
 */
export async function storeExerciseSubmission(input: StoreSubmissionInput) {
  const { file, patientId, clinicId, exercisePrescriptionId, protocolItemId, durationSeconds } = input;

  if (!isR2Configured()) {
    throw Object.assign(new Error("File storage is not configured"), { code: "storage_unconfigured" });
  }

  const recusa = refuseSubmission(file, durationSeconds);
  if (recusa) throw Object.assign(new Error(recusa.message), { code: recusa.code });

  // O nome tem a pasta do paciente — a separação por pessoa está no caminho,
  // não só na consulta. E o carimbo de tempo evita que um reenvio no mesmo
  // segundo sobrescreva o anterior. A extensão sai do tipo real, abaixo.
  const key = `exercise-submissions/${patientId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  // A recusa acima olhou o rótulo — barata, e evita ler 200 MB de um arquivo
  // obviamente errado. Esta olha o conteúdo, e é ela que decide.
  const tipoReal = sniffSubmissionType(buffer);
  if (!tipoReal) {
    throw Object.assign(new Error("Send a video (MP4 or MOV) or a photo (JPEG, PNG, HEIC)."), {
      code: "unsupported_type",
    });
  }
  const recusaReal = refuseSubmission({ type: tipoReal, size: buffer.length }, durationSeconds);
  if (recusaReal) throw Object.assign(new Error(recusaReal.message), { code: recusaReal.code });

  const kind = kindOf(tipoReal);
  const chave = `${key}.${extensionOf(tipoReal)}`;
  await uploadToR2(chave, buffer, tipoReal);

  try {
    return await (prisma as any).exerciseSubmission.create({
      data: {
        clinicId,
        patientId,
        exercisePrescriptionId: exercisePrescriptionId || null,
        protocolItemId: protocolItemId || null,
        kind,
        storageKey: chave,
        mimeType: tipoReal,
        sizeBytes: buffer.length,
        durationSeconds: durationSeconds ?? null,
      },
      select: {
        id: true, kind: true, mimeType: true, sizeBytes: true,
        durationSeconds: true, submittedAt: true,
      },
    });
  } catch (e) {
    // O arquivo subiu e o banco não registrou.
    await deleteFromR2(chave).catch(() => {});
    throw e;
  }
}

/**
 * O conteúdo do arquivo, para a rota que decide quem pode vê-lo.
 *
 * O `range` é repassado de propósito: sem ele o player de vídeo não consegue
 * avançar nem voltar — ele pede pedaços, e um servidor que só sabe mandar o
 * arquivo inteiro obriga a assistir do começo. Num vídeo de um minuto isso
 * parece pouco; para o terapeuta revendo a mesma execução três vezes, não é.
 */
export async function readSubmissionFile(storageKey: string, range?: string) {
  return getR2ObjectStream(storageKey, range);
}
