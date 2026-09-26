import { apiFetch, apiUpload } from "./client";
import { API_URL } from "./config";

/**
 * The patient's thread with the clinic — the channel the web calls "Messages"
 * (`/dashboard/questions`) and the one screen the app's home promised and did
 * not have: its "Message the clinic" link opened the therapist's read-only
 * SOAP notes instead.
 *
 * Same endpoints the web uses. `/api/patient` is already on the middleware's
 * mobile prefix list, so the bearer request carries through unchanged.
 */
export interface ClinicMessage {
  id: string;
  senderRole: "staff" | "patient";
  /** "message" | "notice" | "broadcast" — a broadcast went to several patients. */
  kind: string;
  title: string | null;
  content: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentType: string | null;
  /**
   * A URL que o **app** consegue abrir.
   *
   * `attachmentUrl` aponta para `/api/files/[id]`, que aceita cookie ou token
   * assinado — nunca o bearer do app. A web já está autenticada por cookie; o
   * celular precisa do token, e é o servidor quem o assina, por mensagem e por
   * paciente.
   */
  attachmentOpenUrl: string | null;
  readAt: string | null;
  createdAt: string;
  sender: { firstName: string; lastName: string; role: string } | null;
}

/**
 * Oldest first, as the endpoint returns them — a conversation, not a feed.
 *
 * This took a `poll` flag that suppressed the server's scheduled-broadcast
 * sweep, and neither caller ever passed it. That was written when nothing
 * repeated this request; since 075 T-12 the query revalidates whenever the app
 * comes back to the foreground, so the sweep does run again each time.
 *
 * It stays that way on purpose: `dispatch-broadcasts` exists as a cron route
 * and **is not scheduled anywhere**, so this sweep is the only thing sending a
 * scheduled broadcast. Suppressing it here to save a query would stop them
 * reaching anyone who only uses the app. The claim is atomic, so nothing is
 * ever sent twice.
 */
export async function fetchMessages(): Promise<ClinicMessage[]> {
  const res = await apiFetch<ClinicMessage[]>("/api/patient/messages");
  return Array.isArray(res) ? res : [];
}

export interface OutgoingAttachment {
  uri: string;
  name: string;
  mimeType: string;
}

/**
 * Manda a mensagem, com anexo quando houver.
 *
 * O servidor já aceitava anexo desde antes — `ClinicMessage` tem os campos, a
 * rota lê multipart, e o arquivo vira documento do paciente. O app é que só
 * mandava texto. Aqui é ligar uma ponta na outra.
 *
 * Mensagem só com anexo é válida: o servidor aceita, e põe o nome do arquivo
 * como conteúdo.
 */
export async function sendMessage(
  content: string,
  attachment?: OutgoingAttachment | null
): Promise<ClinicMessage> {
  if (!attachment) {
    return apiFetch<ClinicMessage>("/api/patient/messages", {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  }

  const form = new FormData();
  form.append("content", content);
  form.append("file", {
    uri: attachment.uri,
    name: attachment.name,
    type: attachment.mimeType,
  } as any);
  return apiUpload<ClinicMessage>("/api/patient/messages", form);
}

/** Imagens e PDF, até 25 MB — os mesmos limites que o servidor aplica. */
export const ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;

export function attachmentIsImage(type: string | null): boolean {
  return !!type && type.startsWith("image/");
}

/**
 * O recado de voz (089).
 *
 * Checa o prefixo, e não a lista exata, porque o que decide como **desenhar**
 * é ser áudio — a lista fechada é do servidor, que decide o que **aceitar**.
 */
export function attachmentIsAudio(type: string | null): boolean {
  return !!type && type.startsWith("audio/");
}

/** A URL absoluta do anexo, para abrir ou desenhar. */
export function attachmentHref(m: ClinicMessage): string | null {
  return m.attachmentOpenUrl ? `${API_URL}${m.attachmentOpenUrl}` : null;
}

/** Marks every staff message as read. The server scopes it to the caller. */
export async function markMessagesRead(): Promise<void> {
  await apiFetch("/api/patient/messages", { method: "PATCH" });
}

/** Unread staff messages — what the home badge counts. */
export function unreadFromStaff(messages: ClinicMessage[]): number {
  return messages.filter((m) => m.senderRole === "staff" && !m.readAt).length;
}
