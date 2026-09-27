// Client-safe half of lib/patient-documents.ts — just the validation rule,
// no `prisma` import, so the patient documents page (a client component)
// can check a file BEFORE uploading it instead of only finding out it's
// too big after the whole thing has already gone over the wire. Bundling
// lib/patient-documents.ts itself into client code would pull in Prisma.

export const DOCUMENT_ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
];

export const DOCUMENT_MAX_BYTES = 25 * 1024 * 1024;

/**
 * Os tipos de áudio da mensagem de voz (089).
 *
 * Uma voz é um anexo de conversa como outro qualquer — ela viaja pelo caminho
 * que já existe, com a autenticação que já existe. O que faltava era esta
 * lista: a validação aceitava imagem, PDF, Word, TXT e CSV, e **recusava
 * áudio**.
 *
 * A lista é explícita, e não `audio/*`, porque `audio/*` deixaria entrar
 * qualquer coisa que se declare áudio. Estes quatro são o que um iPhone e um
 * Android gravam.
 */
export const AUDIO_ALLOWED_TYPES = [
  "audio/m4a",
  "audio/mp4",
  "audio/aac",
  "audio/mpeg",
];

/**
 * Dois minutos de voz cabem em muito menos que isto; o teto existe para o caso
 * de alguém mandar um arquivo grande pela mesma porta, não para a gravação.
 */
export const AUDIO_MAX_BYTES = 10 * 1024 * 1024;

/**
 * O vídeo do terapeuta respondendo ao exercício (095 T-6, QA 6.3).
 *
 * A tela oferecia `accept="audio/*,video/*"`, o painel já calculava
 * `replyKind: "video"` — e o servidor recusava todo `video/*` com *"Allowed:
 * images, PDF, Word, TXT, CSV, voice message"*. Responder por vídeo era
 * impossível, e o terapeuta via a frase de erro de **carregamento**, que não
 * diz que o arquivo foi recusado.
 *
 * 50 MB, entre os 10 da voz e um vídeo de verdade: é uma demonstração curta de
 * movimento, gravada no telefone, não um arquivo de edição.
 */
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

export function ehAudio(type: string): boolean {
  return AUDIO_ALLOWED_TYPES.includes(type);
}

/**
 * Rótulos que não dizem nada.
 *
 * O iPhone manda isto com frequência quando o arquivo vem de um diretório de
 * cache, e o `storePatientDocument` já parte do princípio de que **o rótulo é
 * pouco confiável** — ele julga pelos bytes. Este portão não julgava, e era o
 * único lugar do caminho que ainda tratava o rótulo como verdade.
 */
const ROTULOS_VAGOS = ["", "application/octet-stream", "binary/octet-stream"];

/**
 * `.mp4` **não** está aqui, e a ausência é deliberada.
 *
 * Um `.mp4` legítimo é vídeo, e o iPhone manda rótulo vago também para vídeo.
 * Com ele na lista, `aula.mp4` caía no teto de 10 MB da voz e era recusado com
 * "Voice message too large" — ou, se coubesse, era farejado como `video/mp4` e
 * recusado com *"That file is not what it says it is."* para um arquivo que é
 * exatamente o que diz que é. Duas mentiras no lugar de um "tipo não aceito".
 */
const EXTENSOES_DE_AUDIO = [".m4a", ".aac", ".mp3"];

/**
 * O rótulo diz que é áudio, e é um dos que a gente aceita.
 *
 * **Não é `audio/*`.** A primeira versão desta correção abriu o portão para o
 * prefixo inteiro, contra o que o docstring de `AUDIO_ALLOWED_TYPES` manda — e
 * a segunda metade da proteção não cobria o buraco: `payload.bin` enviado como
 * `audio/ogg` passava, o conteúdo não era reconhecido, o nome não prometia
 * áudio, **nenhuma checagem de byte rodava**, e o arquivo era gravado e
 * servido como áudio. A tela do terapeuta então desenhava um player apontando
 * para bytes que não são som. Achado do review de 27/09/2026.
 */
export function ehRotuloDeAudio(type: string): boolean {
  return AUDIO_ALLOWED_TYPES.includes(type.toLowerCase()) || type.toLowerCase() === "audio/x-m4a";
}

/** O nome do arquivo diz que é voz. Quem confirma são os bytes, não ele. */
export function ehAudioPeloNome(name: string | undefined): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  return EXTENSOES_DE_AUDIO.some((e) => n.endsWith(e));
}

/**
 * O portão de entrada — e **ele não é o juiz**.
 *
 * A lista fechada de `AUDIO_ALLOWED_TYPES` continua certa para decidir o que o
 * *conteúdo farejado* pode ser. Como regra de entrada ela estava errada, e o
 * recado de voz do build 17 morreu aqui: o app enviou um `.m4a` legítimo, o
 * rótulo chegou genérico, e a recusa aconteceu antes de alguém olhar um byte.
 *
 * Agora um rótulo de áudio — ou um rótulo vago com nome de áudio — passa para
 * a checagem de conteúdo. Quem recusa um arquivo que mente é o
 * `storePatientDocument`, que exige assinatura quando o nome promete áudio.
 */
export function validatePatientFile(file: { type: string; size: number; name?: string }): string | null {
  const rotulo = (file.type || "").toLowerCase();
  const audio = ehRotuloDeAudio(rotulo) || (ROTULOS_VAGOS.includes(rotulo) && ehAudioPeloNome(file.name));
  const video = rotulo.startsWith("video/");
  if (!audio && !video && !rotulo.startsWith("image/") && !DOCUMENT_ALLOWED_TYPES.includes(file.type)) {
    return "Invalid file type. Allowed: images, video, PDF, Word, TXT, CSV, voice message";
  }
  // Cada um com o seu teto: voz é voz, vídeo é demonstração curta, o resto é
  // arquivo.
  const teto = audio ? AUDIO_MAX_BYTES : video ? VIDEO_MAX_BYTES : DOCUMENT_MAX_BYTES;
  if (file.size > teto) {
    if (audio) return "Voice message too large (max 10MB)";
    if (video) return "Video too large (max 50MB)";
    return "File too large (max 25MB)";
  }
  return null;
}
