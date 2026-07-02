import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { claudeGenerate } from "@/lib/claude";

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
      firstName: true, lastName: true, dateOfBirth: true, gender: true,
      medicalScreenings: {
        orderBy: { createdAt: "desc" }, take: 1,
        select: {
          chiefComplaint: true, painScore: true, painLocation: true,
          aggravatingFactors: true, relievingFactors: true,
          relevantMedicalHistory: true, currentMedications: true,
          occupation: true,
        },
      },
      bodyAssessments: {
        orderBy: { createdAt: "desc" }, take: 1,
        select: { aiSummary: true, aiRecommendations: true, overallScore: true },
      },
      rehabPlans: {
        orderBy: { createdAt: "desc" }, take: 3,
        select: { chiefComplaint: true, bodyPart: true, severity: true, phase: true, status: true, createdAt: true },
      },
    },
  });

  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const age = patient.dateOfBirth
    ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()
    : null;
  const ms = patient.medicalScreenings[0];
  const ba = patient.bodyAssessments[0];

  const patientBrief = [
    `Patient: ${patient.firstName} ${patient.lastName}${age ? `, ${age}yo` : ""}${patient.gender ? `, ${patient.gender}` : ""}`,
    ms?.occupation ? `Occupation: ${ms.occupation}` : "",
    ms?.chiefComplaint ? `Chief complaint: ${ms.chiefComplaint}` : "",
    ms?.painScore != null ? `Pain score: ${ms.painScore}/10` : "",
    ms?.painLocation ? `Pain location: ${ms.painLocation}` : "",
    ms?.aggravatingFactors ? `Aggravating: ${ms.aggravatingFactors}` : "",
    ms?.relievingFactors ? `Relieving: ${ms.relievingFactors}` : "",
    ms?.relevantMedicalHistory ? `Medical history: ${ms.relevantMedicalHistory}` : "",
    ms?.currentMedications ? `Medications: ${ms.currentMedications}` : "",
    ba?.aiSummary ? `Postural assessment: ${ba.aiSummary}` : "",
    ba?.aiRecommendations ? `Assessment recommendations: ${ba.aiRecommendations}` : "",
    patient.rehabPlans.length > 0
      ? `Existing rehab plans: ${patient.rehabPlans.map(p => `${p.bodyPart} (${p.status})`).join(", ")}`
      : "",
  ].filter(Boolean).join("\n");

  const systemPrompt = `You are Atlas, a Clinical Rehabilitation Specialist working directly with a physiotherapist (Bruno). You are having a real-time clinical conversation about a specific patient. Be concise, insightful, and clinically precise. You can answer questions, help with differential diagnosis, suggest approaches, discuss exercises, or just think through the case together.

Current patient context:
${patientBrief || "No clinical data available yet for this patient."}

Respond in the same language the therapist uses (English or Portuguese). Keep responses focused and clinically relevant. You are a trusted colleague, not a formal assistant.`;

  const messages = [
    ...history.map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: message },
  ];

  const reply = await claudeGenerate(messages, { systemPrompt, maxTokens: 1024 });

  // Persist both turns to DB
  await (prisma as any).atlasChatMessage.createMany({
    data: [
      { patientId: params.id, role: "user", content: message },
      { patientId: params.id, role: "assistant", content: reply },
    ],
  });

  return NextResponse.json({ reply });
}
