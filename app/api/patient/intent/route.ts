export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";

/**
 * O que a pessoa veio fazer (083).
 *
 * Depois do cadastro o app perguntava nada e mandava todo mundo para a
 * triagem clínica — quem baixou para comprar um exame de vitamina D era
 * interrogado sobre dor noturna e histórico de câncer. A bifurcação existe
 * para o app parar de adivinhar.
 *
 * `clinic` é a pessoa dizendo "quero ser atendido": ela vira paciente da
 * clínica na hora, e a partir daí tem prontuário, exercícios e conversa — a
 * triagem continua sendo o próximo passo, e o pré-requisito para marcar.
 *
 * `lab` não escreve nada: quem quer só um exame já é o que é. Responder aqui
 * é apenas o app sabendo para onde levar.
 */
export async function POST(request: NextRequest) {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.isImpersonating) {
    return NextResponse.json({ error: "Read-only during impersonation" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const intent = body?.intent;
  if (intent !== "lab" && intent !== "clinic") {
    return NextResponse.json({ error: "intent must be 'lab' or 'clinic'" }, { status: 400 });
  }

  if (intent === "clinic") {
    const me = await prisma.user.findUnique({ where: { id: user.userId }, select: { clinicId: true } });
    if (!me?.clinicId) {
      return NextResponse.json({ error: "No clinic", code: "no_clinic" }, { status: 409 });
    }
    // Idempotente: quem já era paciente continua sendo, e nada é rebaixado —
    // escolher "exame" depois não tira de ninguém o que a clínica já deu.
    await prisma.user.updateMany({
      where: { id: user.userId, role: "PATIENT", isClinicPatient: false },
      data: { isClinicPatient: true },
    });
  }

  return NextResponse.json({ intent });
}
