import { apiFetch } from "./client";

/** Matches the ProtocolPhase enum; it was typed as `number` and printed raw. */
export type ProtocolPhase = "SHORT_TERM" | "MEDIUM_TERM" | "LONG_TERM";

export interface ProtocolItem {
  id: string;
  phase: ProtocolPhase;
  /** The therapist's prescription. Falls back to the exercise library only
   *  when the item carries none — the screen used to read the library values
   *  always, so a 4x15 prescription was shown to the patient as 3x10. */
  sets: number | null;
  reps: number | null;
  sortOrder: number;
  title: string;
  itemType: string;
  /** "Daily", "3x per week" — the therapist's own wording. Returned all along
   *  and simply never declared, so the screen could not show it. */
  frequency: string | null;
  isCompleted: boolean;
  completedCount: number;
  lastCompletedAt: string | null;
  patientNotes: string | null;
  exercise?: {
    id: string;
    name: string;
    description: string;
    instructions: string;
    videoUrl: string | null;
    defaultSets: number;
    defaultReps: number;
  };
}

export interface Protocol {
  id: string;
  status: string;
  /** What the therapist called this plan. The card printed a fixed
   *  "Protocolo — <therapist>" for every plan instead. */
  title: string | null;
  summary: string | null;
  goals: string[] | null;
  /** Safety instructions — "stop any movement that reproduces sharp pain".
   *  The endpoint has always sent these; the app showed none of them. */
  precautions: string | null;
  therapist: { firstName: string; lastName: string };
  diagnosis?: { summary: string };
  items: ProtocolItem[];
  createdAt: string;
}

export async function fetchProtocols(): Promise<Protocol[]> {
  // No catch: an empty list means the therapist has not sent a plan, and the
  // screen says exactly that. Swallowing a failure into [] told a patient who
  // has a protocol that their therapist would create one after the assessment.
  const res = await apiFetch<{ protocols: Protocol[] }>("/api/patient/protocol");
  return res.protocols ?? [];
}

export async function updateProtocolItem(itemId: string, data: { completed?: boolean; notes?: string }) {
  return apiFetch<{ success: boolean; item: ProtocolItem }>("/api/patient/protocol", {
    method: "PATCH",
    body: JSON.stringify({ itemId, ...data }),
  });
}
