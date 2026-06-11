import { apiFetch } from "./client";

export interface ProtocolItem {
  id: string;
  phase: number;
  sortOrder: number;
  title: string;
  itemType: string;
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
  therapist: { firstName: string; lastName: string };
  diagnosis?: { summary: string };
  items: ProtocolItem[];
  createdAt: string;
}

export async function fetchProtocols(): Promise<Protocol[]> {
  try {
    const res = await apiFetch<{ protocols: Protocol[] }>("/api/patient/protocol");
    return res.protocols ?? [];
  } catch {
    return [];
  }
}

export async function updateProtocolItem(itemId: string, data: { completed?: boolean; notes?: string }) {
  return apiFetch<{ success: boolean; item: ProtocolItem }>("/api/patient/protocol", {
    method: "PATCH",
    body: JSON.stringify({ itemId, ...data }),
  });
}
