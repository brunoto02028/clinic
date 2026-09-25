export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { patientGate } from "@/lib/patient-gate";
import { patientOnlyWriteRefusal } from "@/lib/patient-only-write";
import { rateLimit } from "@/lib/rate-limit";
import {
  storeExerciseSubmission,
  MAX_DURATION_SECONDS,
} from "@/lib/exercise-submission";

/**
 * O que o paciente mandou do exercício feito em casa.
 *
 * Esta rota é do paciente e de mais ninguém. O gate compartilhado deixa passar
 * quem não é paciente **de propósito** — rotas que o admin e o portal dividem
 * quebrariam se ele recusasse —, mas aqui não há nada dividido, e herdar a
 * passagem livre seria o mesmo erro que o QA de 24/09 achou na foto de perfil.
 */

/** Os envios deste paciente, com o retorno do terapeuta quando houver. */
export async function GET(req: NextRequest) {
  const gate = await patientGate({ module: "mod_exercises" });
  if (gate.response) return gate.response;

  const patientId = gate.gate.userId;
  const prescriptionId = req.nextUrl.searchParams.get("exercisePrescriptionId");
  const protocolItemId = req.nextUrl.searchParams.get("protocolItemId");

  const submissions = await (prisma as any).exerciseSubmission.findMany({
    // `patientId` sempre no `where`, nunca só no filtro do exercício: é o que
    // garante que um id de exercício de outra pessoa não devolva nada.
    where: {
      patientId,
      ...(prescriptionId ? { exercisePrescriptionId: prescriptionId } : {}),
      ...(protocolItemId ? { protocolItemId } : {}),
    },
    orderBy: { submittedAt: "desc" },
    take: 50,
    select: {
      id: true,
      kind: true,
      mimeType: true,
      durationSeconds: true,
      submittedAt: true,
      reviewedAt: true,
      reviewNote: true,
      exercisePrescriptionId: true,
      protocolItemId: true,
    },
  });

  return NextResponse.json({ submissions, maxDurationSeconds: MAX_DURATION_SECONDS });
}

/** O envio. */
export async function POST(req: NextRequest) {
  const gate = await patientGate({ module: "mod_exercises" });
  if (gate.response) return gate.response;

  const refusal = patientOnlyWriteRefusal(gate.gate);
  if (refusal === "impersonation") {
    return NextResponse.json(
      { error: "Read-only during impersonation", errorPt: "Somente leitura durante a visualização" },
      { status: 403 }
    );
  }
  if (refusal === "not_patient") {
    return NextResponse.json(
      {
        error: "Only the patient sends their own exercise video.",
        errorPt: "Só o paciente envia o próprio vídeo de exercício.",
        code: "patient_only",
      },
      { status: 403 }
    );
  }

  const patientId = gate.gate.userId;
  const clinicId = gate.gate.clinicId;
  if (!clinicId) {
    // Sem clínica não há quem revise — e o envio ficaria numa fila de ninguém.
    return NextResponse.json({ error: "No clinic on this account" }, { status: 400 });
  }

  // Vídeo é caro de receber. Sem limite, um dedo preso no botão enche o
  // armazenamento e a fila do terapeuta.
  const limite = rateLimit(`exercise-submission:${patientId}`, { max: 12, windowMs: 60 * 60_000 });
  if (!limite.allowed) {
    return NextResponse.json(
      {
        error: "Too many uploads. Try again later.",
        errorPt: "Muitos envios. Tente de novo mais tarde.",
        code: "rate_limited",
      },
      { status: 429 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    // Corpo malformado é 400, não falha nossa.
    return NextResponse.json(
      { error: "Send the file as multipart/form-data", code: "bad_request" },
      { status: 400 }
    );
  }

  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file sent" }, { status: 400 });

  const exercisePrescriptionId = (form.get("exercisePrescriptionId") as string) || null;
  const protocolItemId = (form.get("protocolItemId") as string) || null;
  if (!exercisePrescriptionId && !protocolItemId) {
    // Um envio sem exercício é justamente o que esta funcionalidade existe
    // para evitar: mídia solta que ninguém sabe a que se refere.
    return NextResponse.json(
      {
        error: "Send it from the exercise, so the therapist knows which one it is.",
        errorPt: "Envie pelo exercício, para o terapeuta saber qual é.",
        code: "exercise_required",
      },
      { status: 400 }
    );
  }

  // O exercício tem que ser deste paciente. Sem esta checagem, alguém poderia
  // pendurar o próprio vídeo na prescrição de outra pessoa.
  const pertence = exercisePrescriptionId
    ? await (prisma as any).exercisePrescription.findFirst({
        where: { id: exercisePrescriptionId, patientId },
        select: { id: true },
      })
    : await (prisma as any).protocolItem.findFirst({
        where: { id: protocolItemId!, protocol: { patientId } },
        select: { id: true },
      });
  if (!pertence) {
    return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  }

  const durationRaw = form.get("durationSeconds");
  const durationSeconds = durationRaw != null ? Number(durationRaw) : null;

  try {
    const submission = await storeExerciseSubmission({
      file,
      patientId,
      clinicId,
      exercisePrescriptionId,
      protocolItemId,
      durationSeconds: Number.isFinite(durationSeconds!) ? durationSeconds : null,
    });
    return NextResponse.json({ submission });
  } catch (e: any) {
    const code = e?.code;
    if (code === "storage_unconfigured") {
      return NextResponse.json({ error: e.message, code }, { status: 503 });
    }
    if (code === "unsupported_type" || code === "too_large" || code === "too_long") {
      return NextResponse.json({ error: e.message, code }, { status: 400 });
    }
    console.error("[exercise-submissions] POST error:", e?.message);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
