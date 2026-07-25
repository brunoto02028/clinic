import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { claudeGenerate } from "@/lib/claude";
import { patientPseudonym, ageBand } from "@/lib/pseudonymize";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["SUPERADMIN", "ADMIN", "THERAPIST"];

// ── Build full clinical context (resilient — one failure never breaks the whole) ──
async function buildPatientContext(patientId: string) {
  const [patient, ms, ba, diagnosis, protocol, soaps] = await Promise.all([
    prisma.user.findUnique({
      where: { id: patientId },
      select: { firstName: true, lastName: true, dateOfBirth: true } as any,
    }).catch(() => null),
    (prisma as any).medicalScreening.findUnique({ where: { userId: patientId } }).catch(() => null),
    (prisma as any).bodyAssessment.findFirst({ where: { patientId }, orderBy: { createdAt: "desc" } }).catch(() => null),
    (prisma as any).aIDiagnosis.findFirst({ where: { patientId }, orderBy: { createdAt: "desc" }, select: { summary: true, conditions: true, findings: true, recommendations: true } }).catch(() => null),
    (prisma as any).treatmentProtocol.findFirst({
      where: { patientId }, orderBy: { createdAt: "desc" },
      include: { items: { orderBy: [{ phase: "asc" }, { sortOrder: "asc" }], take: 40 } },
    }).catch(() => null),
    (prisma as any).sOAPNote.findMany({ where: { patientId }, orderBy: { createdAt: "desc" }, take: 5 }).catch(() => [] as any[]),
  ]);

  if (!patient) return { patient: null, context: "" };

  const band = ageBand((patient as any).dateOfBirth);

  const lines: string[] = [
    `Patient: ${patientPseudonym(patientId)}${band ? ` (age band: ${band})` : ""}`,
    ms?.occupation ? `Occupation: ${ms.occupation}` : "",
    ms?.chiefComplaint ? `Chief complaint: ${ms.chiefComplaint}` : "",
    ms?.painScore != null ? `Pain VAS: ${ms.painScore}/10` : "",
    ms?.painLocation ? `Pain location: ${ms.painLocation}` : "",
    ms?.surgicalHistory ? `Surgical history: ${ms.surgicalHistory}` : "",
    ms?.otherConditions ? `Comorbidities: ${ms.otherConditions}` : "",
    ms?.currentMedications ? `Medications: ${ms.currentMedications}` : "",
    ms?.allergies ? `Allergies: ${ms.allergies}` : "",
    ms?.treatmentGoals ? `Patient goals: ${ms.treatmentGoals}` : "",
    ms?.functionalLimitations ? `Functional limitations: ${ms.functionalLimitations}` : "",
    ba?.aiSummary ? `Postural/biomechanical assessment: ${ba.aiSummary}` : "",
    diagnosis?.summary ? `Clinical assessment summary: ${diagnosis.summary}` : "",
  ];

  if (protocol) {
    lines.push(`\nCurrent treatment protocol: "${protocol.title}" (status ${protocol.status})`);
    if (protocol.summary) lines.push(`Protocol summary: ${String(protocol.summary).slice(0, 800)}`);
    (protocol.items || []).slice(0, 25).forEach((it: any) => {
      lines.push(`  - [${it.phase}] ${it.title}${it.frequency ? ` (${it.frequency})` : ""}`);
    });
  }

  if ((soaps || []).length > 0) {
    lines.push(`\nRecent clinical notes:`);
    (soaps || []).forEach((s: any) => {
      lines.push(`  [${new Date(s.createdAt).toLocaleDateString("en-GB")}] S: ${s.subjective || ""} | O: ${s.objective || ""} | A: ${s.assessment || ""} | P: ${s.plan || ""}`);
    });
  }

  return { patient, context: lines.filter(Boolean).join("\n") };
}

// ─── POST — Generate a professional patient-related document with Atlas ───
// body: { instructions, docKind, language }
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !ALLOWED_ROLES.includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { instructions, docKind, language } = await req.json();
    if (!instructions?.trim()) {
      return NextResponse.json({ error: "Descreva o que o documento deve conter." }, { status: 400 });
    }

    const { patient, context } = await buildPatientContext(params.id);
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    const clinic = await (prisma as any).clinic.findFirst({
      select: { name: true, email: true, phone: true, address: true, city: true, postcode: true, country: true },
    }).catch(() => null);

    const lang = language === "pt" ? "Brazilian Portuguese (português do Brasil)" : "English (UK)";
    const today = new Date().toLocaleDateString(language === "pt" ? "pt-BR" : "en-GB", { day: "numeric", month: "long", year: "numeric" });

    const systemPrompt = `You are Atlas, clinical rehabilitation specialist at ${clinic?.name || "Bruno Physical Rehabilitation"}. You draft professional clinical correspondence and documents on behalf of the treating rehabilitation professional (Bruno).

RULES:
- Write in ${lang}.
- NEVER use the words "physiotherapy"/"physiotherapist"/"fisioterapia"/"fisioterapeuta" — always "physical rehabilitation"/"reabilitação física" and "rehabilitation professional"/"profissional de reabilitação".
- Produce a COMPLETE, ready-to-send professional document in formal register: proper letterhead block, date, recipient block (use placeholders like [Nome do Médico] / [Doctor's Name] if unknown), subject line, formal salutation, well-structured body grounded in the patient's real clinical data, professional closing and signature block.
- Be clinically precise: cite the patient's relevant conditions, medications and risks from the record when pertinent.
- NEVER write the patient's real name. Whenever you need to refer to the patient by name (salutation, subject line, body references, closing), use the placeholder {{PATIENT_NAME}} instead. The system will replace it with the real name after generation.
- Output PLAIN TEXT only (no markdown symbols like ** or #). Use line breaks and spacing for structure.
- On the FIRST line output only the document title (e.g. "Carta ao Médico Assistente — Pedido de Autorização"), then a blank line, then the document.`;

    const userMsg = `CLINIC INFO:
${clinic ? `${clinic.name}\n${[clinic.address, clinic.postcode, clinic.city, clinic.country].filter(Boolean).join(", ")}\n${[clinic.phone, clinic.email].filter(Boolean).join(" · ")}` : "Bruno Physical Rehabilitation"}

TODAY'S DATE: ${today}

PATIENT CLINICAL RECORD:
${context}

DOCUMENT TYPE REQUESTED: ${docKind || "Professional letter"}

WHAT THE DOCUMENT MUST ACCOMPLISH (therapist's instructions):
${instructions}`;

    const raw = await claudeGenerate(
      [{ role: "user", content: userMsg }],
      { systemPrompt, maxTokens: 4096, temperature: 0.4 }
    );

    const firstBreak = raw.indexOf("\n");
    const title = firstBreak > 0 ? raw.slice(0, firstBreak).trim() : (docKind || "Documento Clínico");
    const content = firstBreak > 0 ? raw.slice(firstBreak).trim() : raw.trim();

    const fullName = `${(patient as any).firstName || ""} ${(patient as any).lastName || ""}`.trim();
    const finalTitle = title.replace(/\{\{PATIENT_NAME\}\}/g, fullName);
    const finalContent = content.replace(/\{\{PATIENT_NAME\}\}/g, fullName);

    return NextResponse.json({ success: true, title: finalTitle, content: finalContent });
  } catch (err: any) {
    console.error("[documents/generate] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
