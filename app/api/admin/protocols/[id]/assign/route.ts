import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyPatient } from "@/lib/notify-patient";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { templateInTenant, mapExercisesToClinic, TEMPLATE_NOT_FOUND } from "@/lib/protocol-template-access";

export const dynamic = "force-dynamic";

// POST — assign a protocol template to a patient
// Creates a TreatmentProtocol (+ ProtocolItems) with status SENT_TO_PATIENT
// and ExercisePrescriptions for HOME_EXERCISE items linked to the exercise library.
//
// Body: patientId, note?, language? ("en"/"pt"; defaults to the patient's
// preferred locale), visibleThroughWeek? (items starting later are created
// hidden from the patient; absent/null = everything visible), onExisting?
// ("archive" | "keep" — required when the patient already has an active
// protocol from this template, otherwise 409 lists them).
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { patientId, note, language, visibleThroughWeek, onExisting } = body;
  if (typeof patientId !== "string" || !patientId) {
    return NextResponse.json({ error: "patientId required" }, { status: 400 });
  }
  if (visibleThroughWeek != null && !(Number.isInteger(visibleThroughWeek) && visibleThroughWeek >= 1)) {
    return NextResponse.json({ error: "visibleThroughWeek must be a whole number of 1 or more, or null" }, { status: 400 });
  }
  if (onExisting !== undefined && onExisting !== "archive" && onExisting !== "keep") {
    return NextResponse.json({ error: 'onExisting must be "archive" or "keep"' }, { status: 400 });
  }

  // The patient must be in the caller's clinic, and so must the template —
  // both answer 404 otherwise, before anything is created or sent.
  const access = await staffPatientAccess(req, patientId);
  if (access.response) return access.response;
  const { actor } = access;
  const clinicId = actor.clinicId as string;

  const template = await templateInTenant(params.id, clinicId, {
    items: { orderBy: [{ phase: "asc" }, { sortOrder: "asc" }] },
  });
  if (!template) return NextResponse.json(TEMPLATE_NOT_FOUND, { status: 404 });

  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    select: { id: true, preferredLocale: true },
  });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  // Assigning the same template twice by accident is how a patient ends up
  // seeing a second, fully released copy of her plan — ask first.
  const activeCopies = { patientId, templateId: template.id, status: { not: "ARCHIVED" } };
  const existing = await (prisma as any).treatmentProtocol.findMany({
    where: activeCopies,
    select: { id: true, title: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  if (existing.length > 0 && !onExisting) {
    return NextResponse.json(
      { error: "This patient already has an active protocol from this template", existing },
      { status: 409 }
    );
  }

  // Bilingual + evidence (activity 18): render the patient instance in the
  // requested language — by default the patient's own — and carry the
  // template's evidence citations onto the protocol.
  const requested = typeof language === "string" && language ? language : patient.preferredLocale || "en-GB";
  const lang = requested.toLowerCase().startsWith("pt") ? "pt-BR" : "en-GB";
  const isPt = lang === "pt-BR";
  const L = (en?: string | null, pt?: string | null): string => (isPt ? pt || en : en) || "";
  let references: any[] = [];
  try {
    references = template.referencesJson ? JSON.parse(template.referencesJson) : [];
    if (!Array.isArray(references)) references = [];
  } catch {
    references = [];
  }

  // Never link another clinic's exercise: same one if it's ours, else our
  // exercise with the same name, else no link.
  const exerciseMap = await mapExercisesToClinic(template.items.map((it: any) => it.exerciseId), clinicId);
  const linkedExercise = (it: any): string | null => (it.exerciseId ? exerciseMap.get(it.exerciseId) ?? null : null);
  const unlinkedExercises = template.items.filter((it: any) => it.exerciseId && !linkedExercise(it)).length;
  const hiddenAtStart = (it: any) => visibleThroughWeek != null && (it.startWeek || 1) > visibleThroughWeek;
  const title = L(template.name, template.namePt);

  const { protocol, prescriptions, archived } = await prisma.$transaction(
    async (tx) => {
      let archivedCount = 0;
      if (onExisting === "archive") {
        // Same filter as the check above, so a copy created since (another
        // tab) is archived too.
        const res = await (tx as any).treatmentProtocol.updateMany({
          where: activeCopies,
          data: { status: "ARCHIVED" },
        });
        archivedCount = res.count;
      }

      const created = await (tx as any).treatmentProtocol.create({
        data: {
          clinicId,
          patientId,
          therapistId: actor.userId,
          templateId: template.id,
          language: lang,
          title,
          summary: [L(template.description, template.descriptionPt), note].filter(Boolean).join("\n\n") || title,
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
              exerciseId: linkedExercise(it),
              sets: it.sets,
              reps: it.reps,
              holdSeconds: it.holdSeconds,
              restSeconds: it.restSeconds,
              frequency: it.frequency,
              startWeek: it.startWeek,
              endWeek: it.endWeek,
              hiddenFromPatient: hiddenAtStart(it),
            })),
          },
        },
      });

      // Prescribe library exercises so they appear in the patient's Exercises area
      let prescribed = 0;
      const seen = new Set<string>();
      for (const it of template.items) {
        const exerciseId = linkedExercise(it);
        if (it.itemType !== "HOME_EXERCISE" || !exerciseId || seen.has(exerciseId)) continue;
        seen.add(exerciseId);
        const already = await (tx as any).exercisePrescription.findFirst({
          where: { patientId, exerciseId, isActive: true },
          select: { id: true },
        });
        if (already) continue;
        await (tx as any).exercisePrescription.create({
          data: {
            clinicId,
            therapistId: actor.userId,
            patientId,
            exerciseId,
            // Ties it to this plan, so it follows the plan's visibility and
            // disappears with it when archived (activity 46).
            protocolId: created.id,
            sets: it.sets,
            reps: it.reps,
            holdSeconds: it.holdSeconds,
            restSeconds: it.restSeconds,
            frequency: it.frequency,
            notes: `${title}${L(it.instructions, it.instructionsPt) ? ` — ${L(it.instructions, it.instructionsPt)}` : ""}`,
          },
        });
        prescribed++;
      }
      return { protocol: created, prescriptions: prescribed, archived: archivedCount };
    },
    { timeout: 30000 }
  );

  // Notify patient
  const appUrl = process.env.NEXTAUTH_URL || "https://bpr.clinic";
  try {
    await notifyPatient({
      patientId,
      plainMessage: `Your therapist assigned you a new treatment protocol: "${template.name}". View it in your portal: ${appUrl}/dashboard/treatment`,
      plainMessagePt: `O seu terapeuta atribuiu-lhe um novo protocolo de tratamento: "${template.namePt || template.name}". Veja no portal: ${appUrl}/dashboard/treatment`,
    });
  } catch (e) {
    console.error("[protocols/assign] notify failed:", e);
  }

  return NextResponse.json(
    { protocolId: protocol.id, prescriptions, unlinkedExercises, archived, language: lang },
    { status: 201 }
  );
}
