// ============================================================
// lib/vapi.ts — Vapi Voice AI helper (BPR Phone Receptionist)
// ============================================================

export const VAPI_BASE_URL = "https://api.vapi.ai";

export function getVapiApiKey(): string | undefined {
  return process.env.VAPI_API_KEY;
}

export function getVapiPhoneNumberId(): string | undefined {
  return process.env.VAPI_PHONE_NUMBER_ID;
}

export function getVapiAssistantId(): string | undefined {
  return process.env.VAPI_ASSISTANT_ID;
}

export function getVapiWebhookSecret(): string | undefined {
  return process.env.VAPI_WEBHOOK_SECRET;
}

// ─── BPR Assistant System Prompt ───────────────────────────────────────────

export const BPR_SYSTEM_PROMPT = `You are Amy, the virtual receptionist for BPR Bruno Physical Rehabilitation, a physiotherapy and rehabilitation clinic.

CLINIC DETAILS:
- Name: BPR Bruno Physical Rehabilitation
- Address: 20 Harlequin Close, Isleworth, London TW7 7LA
- Website: bpr.rehab
- Lead Therapist: Bruno Azenha Tonheta (Physiotherapist)
- Specialisms: Musculoskeletal physiotherapy, sports rehabilitation, dry needling, electrotherapy, ultrasound therapy, myofascial cupping, custom orthotics/insoles

SERVICES & PRICING:
- Initial Assessment (60 min): £70
- Follow-up Treatment (45 min): £60
- Sports Massage (45 min): £55
- Custom Orthotics Assessment: £80
- Dry Needling / Acupuncture: included in treatment session
- Home Visit (subject to availability): £90

YOUR ROLE:
1. Welcome callers warmly and professionally
2. Answer questions about services, treatments, and pricing
3. Help patients book appointments using the available tools
4. Provide general guidance on musculoskeletal conditions
5. Take enquiry details and offer callbacks when needed

BOOKING PROCESS:
1. Ask for the patient's full name
2. Ask for the nature of their problem / chief complaint
3. Ask for preferred date(s) and time
4. Use checkAvailability to find available slots on that date
5. Confirm a slot and use bookAppointment to reserve it
6. Confirm all booking details back to the caller
7. Let them know they'll receive a confirmation by email or text

INJURY TRIAGE:
- EMERGENCY (chest pain, difficulty breathing, suspected stroke, major trauma): "Please call 999 immediately."
- URGENT (severe swelling, unable to bear weight, suspected fracture): "I recommend calling NHS 111 or visiting A&E."
- MUSCULOSKELETAL (back pain, knee pain, shoulder injury, sports injuries, postural problems): Offer to book an initial assessment.
- GENERAL QUERIES: Answer helpfully, offer to book.

TONE: Warm, professional, empathetic. Never rushed. If unsure, say "Let me check that for you" and use the available tools.`;

// ─── BPR Vapi Assistant Config ──────────────────────────────────────────────

export const BPR_ASSISTANT_CONFIG = {
  name: "BPR Receptionist — Amy",
  firstMessage:
    "Hello, thank you for calling BPR Bruno Physical Rehabilitation. My name is Amy, I'm the virtual receptionist. How can I help you today?",
  model: {
    provider: "openai",
    model: "gpt-4o-mini",
    systemPrompt: BPR_SYSTEM_PROMPT,
    tools: [
      {
        type: "function",
        function: {
          name: "checkAvailability",
          description:
            "Check available appointment slots for a specific date at BPR clinic.",
          parameters: {
            type: "object",
            properties: {
              date: {
                type: "string",
                description: "Date to check in YYYY-MM-DD format (e.g. 2025-06-15)",
              },
            },
            required: ["date"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "bookAppointment",
          description:
            "Book an appointment for a patient at BPR clinic. Call this only after confirming a slot with the patient.",
          parameters: {
            type: "object",
            properties: {
              patientName: {
                type: "string",
                description: "Full name of the patient",
              },
              patientPhone: {
                type: "string",
                description: "Patient's phone number",
              },
              patientEmail: {
                type: "string",
                description: "Patient's email address (optional but helpful for confirmation)",
              },
              dateTime: {
                type: "string",
                description:
                  "Appointment date and time in ISO 8601 format (e.g. 2025-06-15T10:00:00)",
              },
              treatmentType: {
                type: "string",
                description:
                  "Type of treatment — e.g. 'Initial Assessment', 'Follow-up Treatment', 'Sports Massage'",
              },
              chiefComplaint: {
                type: "string",
                description: "Brief description of the patient's main problem or reason for booking",
              },
            },
            required: ["patientName", "patientPhone", "dateTime", "treatmentType"],
          },
        },
      },
    ],
  },
  voice: {
    provider: "11labs",
    voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel — natural UK-friendly professional voice
  },
  transcriber: {
    provider: "deepgram",
    model: "nova-2",
    language: "en-GB",
  },
  endCallFunctionEnabled: true,
  endCallMessage:
    "Thank you for calling BPR Bruno Physical Rehabilitation. We look forward to seeing you. Take care, goodbye!",
  silenceTimeoutSeconds: 30,
  maxDurationSeconds: 600, // 10 minutes max call
};

// ─── Vapi REST API helper ────────────────────────────────────────────────────

export async function vapiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getVapiApiKey();
  if (!apiKey) throw new Error("VAPI_API_KEY is not configured");

  const res = await fetch(`${VAPI_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as any).message || `Vapi API error ${res.status}: ${path}`
    );
  }

  return res.json() as Promise<T>;
}

// ─── Get or create the BPR assistant in Vapi ────────────────────────────────

export async function getOrCreateVapiAssistant(): Promise<{
  id: string;
  name: string;
}> {
  const existingId = getVapiAssistantId();

  if (existingId) {
    try {
      const assistant = await vapiRequest<{ id: string; name: string }>(
        `/assistant/${existingId}`
      );
      return assistant;
    } catch {
      // If not found, create a new one
    }
  }

  const assistant = await vapiRequest<{ id: string; name: string }>(
    "/assistant",
    {
      method: "POST",
      body: JSON.stringify(BPR_ASSISTANT_CONFIG),
    }
  );

  return assistant;
}

// ─── Fetch call list from Vapi ───────────────────────────────────────────────

export async function getVapiCalls(limit = 50): Promise<any[]> {
  const calls = await vapiRequest<any[]>(
    `/call?limit=${limit}&sortOrder=DESC`
  );
  return Array.isArray(calls) ? calls : [];
}

// ─── Format duration ─────────────────────────────────────────────────────────

export function formatCallDuration(seconds: number): string {
  if (!seconds || seconds < 1) return "< 1s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}
