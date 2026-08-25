import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { notifyPatient } from "@/lib/notify-patient";

export const dynamic = "force-dynamic";
const ALLOWED_ROLES = ["ADMIN", "SUPERADMIN", "STAFF", "THERAPIST"];

// POST — assign a protocol template to a patient
// Creates a TreatmentProtocol (+ ProtocolItems) with status SENT_TO_PATIENT
// and ExercisePrescriptions for HOME_EXERCISE items linked to the exercise library.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const therapistId = (session.user as any).id;

  const { patientId, note, language } = await req.json();
  if (!patientId) return NextResponse.json({ error: "patientId required" }, { status: 400 });

  const [template, patient, therapist] = await Promise.all([
    (prisma as any).protocolTemplate.findUnique({
      where: { id: params.id },
      include: { items: { orderBy: [{ phase: "asc" }, { sortOrder: "asc" }] } },
    }),
    prisma.user.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true, clinicId: true },
    }),
    prisma.user.findUnique({
      where: { id: therapistId },
      select: { clinicId: true },
    }),
  ]);

  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const clinicId = patient.clinicId || therapist?.clinicId;
  if (!clinicId) return NextResponse.json({ error: "No clinic context" }, { status: 400 });

  // Bilingual + evidence (activity 18): render the patient instance in the
  // requested language (defaults to English) and carry the template's evidence
  // citations onto the protocol so the patient's plan keeps its references.
  const lang = typeof language === "string" && language.toLowerCase().startsWith("pt") ? "pt-BR" : "en-GB";
  const isPt = lang === "pt-BR";
  const L = (en?: string | null, pt?: string | null): string => (isPt ? pt || en : en) || "";
  let references: any[] = [];
  try {
    references = template.referencesJson ? JSON.parse(template.referencesJson) : [];
    if (!Array.isArray(references)) references = [];
  } catch {
    references = [];
  }

  // Create the patient protocol instance
  const protocol = await (prisma as any).treatmentProtocol.create({
    data: {
      clinicId,
      patientId,
      therapistId,
      templateId: template.id,
      language: lang,
      title: L(template.name, template.namePt),
      summary: [L(template.description, template.descriptionPt), note].filter(Boolean).join("\n\n") || L(template.name, template.namePt),
      goals: [],
      references,
      status: "SENT_TO_PATIENT",
      sentToPatientAt: new Date(),
      approvedAt: new Date(),
      estimatedWeeks: template.estimatedWeeks,
      sessionsPerWeek: template.sessionsPerWeek,
      startDate: new Date(),
      items: {
        create: template.items.map((it: any) => ({
          phase: it.phase,
          itemType: it.itemType,
          sortOrder: it.sortOrder,
          title: L(it.title, it.titlePt),
          description: L(it.description, it.descriptionPt) || L(it.title, it.titlePt),
          instructions: L(it.instructions, it.instructionsPt),
          treatmentTypeName: it.treatmentTypeName,
          sessionDuration: it.sessionDuration,
          sessionsPerWeek: it.sessionsPerWeek,
          exerciseId: it.exerciseId,
          sets: it.sets,
          reps: it.reps,
          holdSeconds: it.holdSeconds,
          restSeconds: it.restSeconds,
          frequency: it.frequency,
          startWeek: it.startWeek,
          endWeek: it.endWeek,
        })),
      },
    },
  });

  // Prescribe library exercises so they appear in the patient's Exercises area
  const exerciseItems = template.items.filter((it: any) => it.itemType === "HOME_EXERCISE" && it.exerciseId);
  for (const it of exerciseItems) {
    const existing = await (prisma as any).exercisePrescription.findFirst({
      where: { patientId, exerciseId: it.exerciseId, isActive: true },
    });
    if (!existing) {
      await (prisma as any).exercisePrescription.create({
        data: {
          clinicId,
          therapistId,
          patientId,
          exerciseId: it.exerciseId,
          sets: it.sets,
          reps: it.reps,
          holdSeconds: it.holdSeconds,
          restSeconds: it.restSeconds,
          frequency: it.frequency,
          notes: `${L(template.name, template.namePt)}${L(it.instructions, it.instructionsPt) ? ` — ${L(it.instructions, it.instructionsPt)}` : ""}`,
        },
      });
    }
  }

  // Notify patient
  const appUrl = process.env.NEXTAUTH_URL || "https://bpr.clinic";
  try {
    await notifyPatient({
      patientId,
      plainMessage: `Your therapist assigned you a new treatment protocol: "${template.name}". View it in your portal: ${appUrl}/dashboard/treatment`,
      plainMessagePt: `O seu terapeuta atribuiu-lhe um novo protocolo de tratamento: "${template.name}". Veja no portal: ${appUrl}/dashboard/treatment`,
    });
  } catch (e) {
    console.error("[protocols/assign] notify failed:", e);
  }

  return NextResponse.json(
    { protocolId: protocol.id, prescriptions: exerciseItems.length },
    { status: 201 }
  );
}
