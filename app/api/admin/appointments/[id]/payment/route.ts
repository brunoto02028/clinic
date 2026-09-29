export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor } from "@/lib/tenant-access";

/**
 * O dinheiro que entrou fora do sistema (106 T-6).
 *
 * O Bruno: *"quando um paciente que conhecemos liga na clinic e quer agendar
 * uma consulta, e a clini agenda uma consulta e ele paga com transferência na
 * conta, a clini coloca como pago e libera a consulta."*
 *
 * ## Confirmar e receber eram duas coisas, e só uma tinha botão
 *
 * O botão *Confirm* já existia e põe a consulta em `CONFIRMED`. O que ele não
 * faz é criar `Payment` nenhum — então a consulta ficava confirmada **sem nada
 * nos livros**, e três meses depois ninguém sabia se aquilo foi pago, cortesia
 * ou esquecimento.
 *
 * Aqui as duas acontecem **no mesmo ato**, de propósito: dois botões em
 * sequência viram um esquecido.
 */

/** Os canais que a clínica de fato usa. Maquininha ficou de fora: não há uma. */
const CANAIS_MANUAIS = ["TRANSFER", "CASH"] as const;
type CanalManual = (typeof CANAIS_MANUAIS)[number];

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  /**
   * Receber dinheiro não é ação de terapeuta.
   *
   * Ele marca presença, conclui, cancela — e lê a fila. Dizer que um valor
   * entrou na conta da clínica é outra coisa, e fica com quem administra.
   */
  if (!["ADMIN", "SUPERADMIN"].includes(actor.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!actor.clinicId) {
    return NextResponse.json({ error: "No clinic context" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const canal = body?.channel as CanalManual | undefined;
  if (!canal || !CANAIS_MANUAIS.includes(canal)) {
    return NextResponse.json(
      { error: "channel must be TRANSFER or CASH", code: "bad_channel" },
      { status: 400 }
    );
  }
  const nota = typeof body?.note === "string" ? body.note.trim().slice(0, 500) : null;

  // A parede junto do id: 404 para o que não é desta clínica, nunca 403 — e
  // nunca `findUnique` pelo id sozinho.
  const consulta = await prisma.appointment.findFirst({
    where: { id: params.id, clinicId: actor.clinicId },
    select: { id: true, status: true, price: true, patientId: true, payment: { select: { id: true, status: true } } },
  });
  if (!consulta) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  if (consulta.payment && consulta.payment.status === "SUCCEEDED") {
    return NextResponse.json(
      { error: "This appointment is already paid", code: "already_paid" },
      { status: 409 }
    );
  }
  if (["CANCELLED", "NO_SHOW"].includes(consulta.status)) {
    return NextResponse.json(
      { error: "This appointment did not happen", code: "not_scheduled" },
      { status: 409 }
    );
  }
  /**
   * Preço zero não recebe pagamento.
   *
   * Uma consulta sem cobrança (106 T-3) já nasce confirmada; registrar £0,00
   * como recebido põe uma linha falsa no faturamento.
   */
  if (!consulta.price || consulta.price <= 0) {
    return NextResponse.json(
      { error: "This appointment has no charge", code: "nothing_to_pay" },
      { status: 409 }
    );
  }

  const agora = new Date();
  const dadosDoPagamento = {
    amount: consulta.price,
    status: "SUCCEEDED" as const,
    channel: canal,
    note: nota,
    recordedById: actor.userId,
    recordedAt: agora,
  };

  const [pagamento, consultaAtualizada] = await prisma.$transaction([
    // `upsert`: uma consulta pode já ter um `Payment` pendente da Stripe que
    // nunca se completou. Registrar o dinheiro que entrou por fora fecha
    // aquele, em vez de deixar dois registros para a mesma consulta.
    (prisma as any).payment.upsert({
      where: { appointmentId: consulta.id },
      create: {
        appointmentId: consulta.id,
        userId: consulta.patientId,
        clinicId: actor.clinicId,
        ...dadosDoPagamento,
      },
      update: dadosDoPagamento,
    }),
    prisma.appointment.update({
      where: { id: consulta.id },
      data: { status: "CONFIRMED" },
    }),
  ]);

  return NextResponse.json({
    paid: true,
    channel: canal,
    amount: pagamento.amount,
    status: consultaAtualizada.status,
  });
}

/**
 * Desfazer — porque marcar por engano tem de ter volta.
 *
 * O pagamento volta a `FAILED` em vez de sumir: apagar a linha apagaria também
 * o registro de que alguém a criou, e o que se quer desfazer é o valor, não a
 * história. A consulta volta a `PENDING`, que é o estado de quem espera
 * pagamento.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SUPERADMIN"].includes(actor.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!actor.clinicId) {
    return NextResponse.json({ error: "No clinic context" }, { status: 400 });
  }

  const consulta = await prisma.appointment.findFirst({
    where: { id: params.id, clinicId: actor.clinicId },
    select: { id: true, payment: { select: { id: true, channel: true } } },
  });
  if (!consulta?.payment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }
  /**
   * Só o que foi anotado à mão se desfaz por aqui.
   *
   * Desfazer um pagamento da Stripe é reembolso, tem dinheiro do outro lado e
   * mora em outro lugar. Deixar este botão mexer nele seria oferecer um
   * estorno que não estorna nada.
   */
  if (consulta.payment.channel === "STRIPE") {
    return NextResponse.json(
      { error: "Card payments are undone by refunding", code: "stripe_payment" },
      { status: 409 }
    );
  }

  await prisma.$transaction([
    (prisma as any).payment.update({
      where: { id: consulta.payment.id },
      data: { status: "FAILED", recordedById: actor.userId, recordedAt: new Date() },
    }),
    prisma.appointment.update({
      where: { id: consulta.id },
      data: { status: "PENDING" },
    }),
  ]);

  return NextResponse.json({ paid: false, status: "PENDING" });
}
