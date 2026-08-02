import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { claudeGenerate } from "@/lib/claude";
import { patientPseudonym, ageBand } from "@/lib/pseudonymize";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["ADMIN", "SUPERADMIN", "STAFF"];

// GET — load persistent chat history for this patient
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const messages = await (prisma as any).atlasChatMessage.findMany({
    where: { patientId: params.id },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return NextResponse.json(messages);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message, history = [] } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "No message" }, { status: 400 });

  // Fetch patient clinical snapshot
  const patient = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      firstName: true, lastName: true, dateOfBirth: true,
      medicalScreening: {
        select: {
          chiefComplaint: true, painScore: true, painLocation: true,
          painAggravating: true, painRelieving: true,
          currentMedications: true, occupation: true,
          surgicalHistory: true, otherConditions: true,
        },
      },
      bodyAssessmentsAsPatient: {
        orderBy: { createdAt: "desc" }, take: 1,
        select: { aiSummary: true, aiRecommendations: true, overallScore: true },
      },
      rehabPlansAsPatient: {
        orderBy: { createdAt: "desc" }, take: 3,
        select: { chiefComplaint: true, bodyPart: true, severity: true, phase: true, status: true, createdAt: true },
      },
    },
  });

  // Fetch answered question sets for context
  const answeredQSets = await (prisma as any).patientQuestion.findMany({
    where: { patientId: params.id, status: "answered" },
    orderBy: { answeredAt: "desc" },
    take: 3,
  });

  // Fetch recent clinic <-> patient messages
  const clinicMessages = await (prisma as any).clinicMessage.findMany({
    where: { patientId: params.id, kind: "message" },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { senderRole: true, content: true, createdAt: true },
  });

  // Fetch available protocol templates (names + conditions + equipment)
  const protocols = await (prisma as any).protocolTemplate.findMany({
    where: { isActive: true },
    select: { name: true, condition: true, bodyRegion: true, equipment: true, estimatedWeeks: true, sessionsPerWeek: true },
    orderBy: { name: "asc" },
    take: 20,
  });

  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const band = ageBand(patient.dateOfBirth);
  const ms = patient.medicalScreening;
  const ba = patient.bodyAssessmentsAsPatient[0];

  const patientBrief = [
    `Patient: ${patientPseudonym(params.id)}${band ? ` (age band: ${band})` : ""}`,
    ms?.occupation ? `Occupation: ${ms.occupation}` : "",
    ms?.chiefComplaint ? `Chief complaint: ${ms.chiefComplaint}` : "",
    ms?.painScore != null ? `Pain score: ${ms.painScore}/10` : "",
    ms?.painLocation ? `Pain location: ${ms.painLocation}` : "",
    ms?.painAggravating ? `Aggravating: ${ms.painAggravating}` : "",
    ms?.painRelieving ? `Relieving: ${ms.painRelieving}` : "",
    ms?.surgicalHistory ? `Surgical history: ${ms.surgicalHistory}` : "",
    ms?.otherConditions ? `Other conditions: ${ms.otherConditions}` : "",
    ms?.currentMedications ? `Medications: ${ms.currentMedications}` : "",
    ba?.aiSummary ? `Postural assessment: ${ba.aiSummary}` : "",
    ba?.aiRecommendations ? `Assessment recommendations: ${ba.aiRecommendations}` : "",
    patient.rehabPlansAsPatient.length > 0
      ? `Existing rehab plans: ${patient.rehabPlansAsPatient.map(p => `${p.bodyPart} (${p.status})`).join(", ")}`
      : "",
    answeredQSets.length > 0
      ? `\nPre-consultation answers from patient:\n${answeredQSets.map((qs: any) => {
          const qaText = (qs.questions as string[]).map((q: string, i: number) => {
            const a = (qs.answers as any[])?.find((x: any) => x.index === i);
            return `  Q: ${q}\n  A: ${a?.answer || "(no answer)"}`;
          }).join("\n");
          return `[${new Date(qs.answeredAt).toLocaleDateString("en-GB")}]\n${qaText}`;
        }).join("\n\n")}`
      : "",
    clinicMessages.length > 0
      ? `\nRecent clinic↔patient message thread (newest first):\n${[...clinicMessages].reverse().map((m: any) => {
          const who = m.senderRole === "patient" ? "Patient" : "Clinic";
          const date = new Date(m.createdAt).toLocaleDateString("en-GB");
          return `  [${date}] ${who}: ${m.content}`;
        }).join("\n")}`
      : "",
    protocols.length > 0
      ? `\nAvailable treatment protocol templates in this clinic:\n${protocols.map((p: any) =>
          `  • ${p.name}${p.condition ? ` (${p.condition})` : ""} — ${p.equipment?.join(", ") || ""}${p.estimatedWeeks ? ` — ~${p.estimatedWeeks} weeks` : ""}`
        ).join("\n")}`
      : "",
  ].filter(Boolean).join("\n");

  const systemPrompt = `You are Atlas — a senior physical rehabilitation specialist with over 30 years of clinical experience in musculoskeletal, neurological, and sports rehabilitation. You trained in Portugal, completed advanced certifications in manual therapy (IFOMPT), pain neuroscience, and exercise prescription. You have treated thousands of patients and mentored dozens of clinicians. You are Bruno's trusted clinical colleague — you speak directly, think critically, and always back your reasoning with evidence.

TERMINOLOGY RULE: NEVER use the words "physiotherapy", "physiotherapist" or "fisioterapia". Always use "physical rehabilitation" / "reabilitação física" and "physical rehabilitation specialist" instead.

PRIVACY RULE: The patient is referred to by a pseudonym (e.g. P-XXXXXXXX) in this conversation. If the user mentions a person's real name in their message, treat it as referring to this same patient — do NOT ask for clarification or express confusion about the identity. Simply continue your clinical reasoning about the patient.

Your clinical principles:
- Biopsychosocial model first. Pain is never purely structural.
- Evidence-based but pragmatic. RCTs guide you; clinical intuition refines it.
- You flag RED FLAGS immediately (cauda equina, cord compression, fracture risk, malignancy, etc.).
- You NEVER recommend anything that could harm the patient.
- When you cite research, you state the source explicitly: e.g. "According to Chou et al. (2017) in The Lancet Spine, ..." or "Per NICE guidelines (NG59, 2016), ..." or "A Cochrane review (2021) found...". If you are drawing from general clinical consensus rather than a specific paper, say so.
- If asked about something outside your direct knowledge, you say: "I don't have a specific study to cite here, but based on clinical consensus..." — never fabricate references.

You have full visibility into this patient's data:
- Clinical screening, pain scores, medications, surgical history
- Body/postural assessment AI summary
- Rehab plan history and message thread
- All available protocol templates in the clinic (with equipment and timelines)

Current patient context:
${patientBrief || "No clinical data available yet for this patient."}

When recommending a treatment plan:
- Reference specific protocol templates from the clinic's library if they match
- Suggest phased progressions (acute / subacute / rehabilitation / return-to-function)
- Include equipment-specific parameters when relevant (e.g. MLS Laser: 4J/cm² at 10Hz for pain, 8J/cm² at 50Hz for tissue repair)
- Suggest HEP (home exercise programme) alongside in-clinic treatment

Respond in the same language Bruno uses (English or Portuguese).
IMPORTANT — when suggesting questions to send to the patient: write them in SECOND PERSON directly to the patient ("você" in Brazilian Portuguese, "you" in English). Never use third person ("o paciente", "ele", "ela"). Use warm, simple, non-clinical language. If writing in Portuguese, always use Brazilian Portuguese (pt-BR).`;

  const messages = [
    ...history.map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: message },
  ];

  const reply = await claudeGenerate(messages, { systemPrompt, maxTokens: 3000 });

  // Persist both turns to DB
  await (prisma as any).atlasChatMessage.createMany({
    data: [
      { patientId: params.id, role: "user", content: message },
      { patientId: params.id, role: "assistant", content: reply },
    ],
  });

  return NextResponse.json({ reply });
}
