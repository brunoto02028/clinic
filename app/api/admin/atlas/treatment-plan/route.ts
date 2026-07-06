import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { claudeGenerate } from "@/lib/claude";
import { resolveClinicId } from "@/lib/resolve-clinic-id";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["ADMIN", "SUPERADMIN", "STAFF", "THERAPIST"];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clinicId = await resolveClinicId(session);
  const { patientId, soap } = await req.json();
  if (!patientId) return NextResponse.json({ error: "patientId required" }, { status: 400 });

  const [patient, equipment] = await Promise.all([
    prisma.user.findUnique({
      where: { id: patientId },
      select: {
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        medicalScreening: {
          select: {
            chiefComplaint: true,
            painScore: true,
            painLocation: true,
            currentMedications: true,
            otherConditions: true,
          },
        },
        bodyAssessmentsAsPatient: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { aiSummary: true, aiRecommendations: true },
        },
      },
    }),
    (prisma as any).clinicEquipment.findMany({
      where: { clinicId, isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const ms = patient.medicalScreening;
  const ba = patient.bodyAssessmentsAsPatient[0];

  const patientSummary = [
    `Patient: ${patient.firstName} ${patient.lastName}`,
    ms?.chiefComplaint ? `Chief complaint: ${ms.chiefComplaint}` : "",
    ms?.painScore != null ? `Pain: ${ms.painScore}/10` : "",
    ms?.painLocation ? `Location: ${ms.painLocation}` : "",
    ms?.otherConditions ? `Comorbidities: ${ms.otherConditions}` : "",
    ms?.currentMedications ? `Medications: ${ms.currentMedications}` : "",
    ba?.aiSummary ? `Posture: ${ba.aiSummary}` : "",
  ].filter(Boolean).join("\n");

  const soapSection = soap
    ? `\nCurrent SOAP note:\n  S: ${soap.subjective || ""}\n  O: ${soap.objective || ""}\n  A: ${soap.assessment || ""}\n  P: ${soap.plan || ""}`
    : "";

  const equipmentSection = equipment.length > 0
    ? "\n\nAvailable clinic equipment:\n" + equipment.map((eq: any) => {
        const protocols = eq.protocols ? (() => { try { return JSON.parse(eq.protocols); } catch { return []; } })() : [];
        const indications = eq.indications ? (() => { try { return JSON.parse(eq.indications); } catch { return []; } })() : [];
        return `- ${eq.name}${eq.manufacturer ? ` (${eq.manufacturer}${eq.model ? " " + eq.model : ""})` : ""}
  Indications: ${indications.join(", ") || "general rehabilitation"}
  Protocols available: ${protocols.length > 0 ? protocols.map((p: any) => p.condition).join(", ") : "see clinical judgment"}`;
      }).join("\n")
    : "";

  const systemPrompt = `You are Atlas, a clinical rehabilitation specialist. Based on the patient's profile, SOAP assessment, and the clinic's available equipment, generate a detailed treatment plan.

Return ONLY a valid JSON object with these fields:
{
  "diagnosis": "working diagnosis in 1-2 sentences",
  "goals": ["short-term goal 1", "short-term goal 2", "long-term goal"],
  "sessions": number (recommended total sessions),
  "frequency": "e.g. 2x/week for 4 weeks",
  "phases": [
    {
      "name": "Phase name",
      "weeks": "e.g. Weeks 1-2",
      "focus": "brief description",
      "interventions": ["intervention 1", "intervention 2"],
      "equipment": ["equipment name if applicable"]
    }
  ],
  "hep": ["home exercise 1", "home exercise 2"],
  "progressCriteria": "criteria to progress to next phase or discharge",
  "contraindications": "any contraindications to note",
  "notes": "additional clinical notes"
}`;

  const reply = await claudeGenerate(
    [{ role: "user", content: `Generate a treatment plan for:\n${patientSummary}${soapSection}${equipmentSection}` }],
    { systemPrompt, maxTokens: 2000 }
  );

  let parsed: any = {};
  try {
    const jsonMatch = reply.match(/\{[\s\S]*\}/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
  } catch {
    parsed = { notes: reply };
  }

  return NextResponse.json(parsed);
}
