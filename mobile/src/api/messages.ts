import { apiFetch } from "./client";

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
  readAt: string | null;
  createdAt: string;
  sender: { firstName: string; lastName: string; role: string } | null;
}

/**
 * Oldest first, as the endpoint returns them — a conversation, not a feed.
 *
 * This took a `poll` flag that suppressed the server's scheduled-broadcast
 * sweep, and neither caller ever passed it; there is no `refetchInterval` on
 * this query either, so nothing polls. The parameter is gone rather than left
 * as a promise the code does not keep.
 */
export async function fetchMessages(): Promise<ClinicMessage[]> {
  const res = await apiFetch<ClinicMessage[]>("/api/patient/messages");
  return Array.isArray(res) ? res : [];
}

export async function sendMessage(content: string): Promise<ClinicMessage> {
  return apiFetch<ClinicMessage>("/api/patient/messages", {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

/** Marks every staff message as read. The server scopes it to the caller. */
export async function markMessagesRead(): Promise<void> {
  await apiFetch("/api/patient/messages", { method: "PATCH" });
}

/** Unread staff messages — what the home badge counts. */
export function unreadFromStaff(messages: ClinicMessage[]): number {
  return messages.filter((m) => m.senderRole === "staff" && !m.readAt).length;
}
