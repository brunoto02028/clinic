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
