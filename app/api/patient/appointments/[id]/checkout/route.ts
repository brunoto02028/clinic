import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { patientGate } from "@/lib/patient-gate";
import {
  reservarCupom,
  anexarSessao,
  liberarReserva,
  confirmarSemCobranca,
} from "@/lib/coupon-redemption";

export const dynamic = "force-dynamic";

/**
 * O pagamento que transforma um horário pedido em horário reservado.
 *
 * A primeira consulta paga no ato: com o paciente novo não existe relação
 * nenhuma, e o pagamento é o que separa um desconhecido de um compromisso.
 * A consulta nasce `PENDING` — ela **não** é confirmada aqui. Quem confirma é
 * o webhook, depois de a Stripe dizer que o dinheiro entrou; confirmar antes
 * seria reservar horário para quem fechou a aba do Checkout.
 *
 * Só atende a consulta **deste** paciente, e só a que ainda espera pagamento.
 */

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2024-06-20" as any });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await patientGate({ module: "mod_appointments" });
  if (gate.response) return gate.response;
  const userId = gate.gate!.userId;

  const appointment = await prisma.appointment.findFirst({
    // O `patientId` no `where` é o que impede pagar — ou ler — a consulta de
    // outra pessoa: um id de outro paciente simplesmente não existe aqui.
    where: { id: params.id, patientId: userId },
    select: {
      id: true,
      price: true,
      status: true,
      dateTime: true,
      treatmentType: true,
      kind: true,
      clinicId: true,
      patient: { select: { email: true } },
    },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (appointment.status !== "PENDING") {
    return NextResponse.json(
      {
        error: "This appointment is not waiting for payment.",
        errorPt: "Esta consulta não está esperando pagamento.",
        code: "not_payable",
      },
      { status: 409 }
    );
  }
  if (!appointment.price || appointment.price <= 0) {
    return NextResponse.json(
      { error: "Nothing to pay.", errorPt: "Nada a pagar.", code: "nothing_to_pay" },
      { status: 409 }
    );
  }

  /**
   * O cupom (084, T-4).
   *
   * O **código** vem do app; o desconto é recalculado aqui. A prévia da T-3 é
   * uma tela, e tela não autoriza cobrança — aceitar o valor que o cliente
   * mandou seria a N4 da 080 pelo avesso.
   *
   * Recusa não derruba a marcação: a consulta já existe e ainda espera
   * pagamento. O paciente lê o motivo e paga o preço cheio, ou volta com outro
   * código. Perder o horário por causa de um cupom expirado seria punir a
   * pessoa errada.
   */
  const corpo = await req.json().catch(() => ({}));
  const cupom = appointment.clinicId
    ? await reservarCupom({
        clinicId: appointment.clinicId,
        patientId: userId,
        code: corpo?.couponCode ?? null,
        scope: appointment.kind === "FIRST_CONSULTATION" ? "CONSULTATION" : "TREATMENT_SESSION",
        amount: appointment.price,
        currency: "GBP",
        // **Esta** consulta. Duas consultas pendentes são duas compras, e a
        // segunda bate no limite em vez de reaproveitar a reserva da primeira.
        targetId: appointment.id,
        /**
         * Preguiçoso e tolerante (W-2 do QA das telas, 26/09/2026).
         *
         * `getStripe()` **lança** sem `STRIPE_SECRET_KEY`, e esta linha roda
         * antes do ramo da cortesia de 100% — que não cobra nada — e fora do
         * `try`. Num ambiente sem a chave, uma consulta que deveria sair
         * confirmada e de graça virava um 500 de corpo vazio, e o app dizia
         * "marcado, ainda não pago". Em produção a chave existe; o que isso
         * custava era confiança em toda medição local.
         *
         * Sem Stripe não dá para expirar a sessão anterior — e é aceitável:
         * sem Stripe também não houve sessão anterior.
         */
        stripe: (() => {
          try {
            return getStripe();
          } catch {
            return null;
          }
        })(),
      })
    : ({ tipo: "sem_cupom" } as const);

  if (cupom.tipo === "recusado") {
    return NextResponse.json(
      {
        error: cupom.recusa.message,
        errorPt: cupom.recusa.messagePt,
        code: "coupon_rejected",
        reason: cupom.recusa.reason,
      },
      { status: 409 }
    );
  }

  const aCobrar = cupom.tipo === "reservado" ? cupom.reserva.final : appointment.price;

  /**
   * Cortesia com código: o cupom zerou o preço (A-2 do review + F-2 do QA da
   * T-4, 26/09/2026).
   *
   * Isto respondia `409 nada a pagar` com a consulta já `PENDING`, e o app
   * traduzia para *"marcado, ainda não pago — abra Consultas para pagar"*, numa
   * tela onde pagar dava o mesmo 409. O horário ficava pendente para sempre, e
   * o comentário que estava aqui ("isto não acontece hoje") estava errado: o
   * zero vem do cupom, não do preço.
   *
   * Sem cobrança não há webhook, então a confirmação é aqui — com a mesma
   * guarda que o webhook usa (`status: "PENDING"` no `where`), para um duplo
   * toque não confirmar duas vezes. O app já trata `url: null` seguindo para a
   * tela de confirmação.
   */
  if (cupom.tipo === "reservado" && aCobrar <= 0) {
    const r = await prisma.appointment.updateMany({
      where: { id: appointment.id, status: "PENDING", patientId: userId },
      data: { status: "CONFIRMED" },
    });
    if (r.count === 1) {
      await confirmarSemCobranca(cupom.reserva.redemptionId);
    } else {
      // Outra chamada simultânea confirmou primeiro. Sem isto a reserva desta
      // ficava sem sessão e sem confirmação, ocupando vaga da campanha por 24h
      // até a janela passar (R-2 do reteste).
      await liberarReserva(cupom.reserva.redemptionId);
    }
    return NextResponse.json({
      url: null,
      covered: true,
      code: cupom.reserva.code,
      message: "Your code covered this in full — the appointment is confirmed.",
      messagePt: "Seu código cobriu tudo — a consulta está confirmada.",
    });
  }

  // Sem cupom e sem preço não há o que cobrar. A guarda acima já tratou o preço
  // zerado **por cupom**; esta é a consulta que nasceu sem preço.
  if (aCobrar <= 0) {
    return NextResponse.json(
      { error: "Nothing to pay.", errorPt: "Nada a pagar.", code: "nothing_to_pay" },
      { status: 409 }
    );
  }

  /**
   * A Stripe não cobra menos de 30 pence.
   *
   * Um desconto que deixa o total em £0,20 faz a criação da sessão falhar com
   * uma mensagem da Stripe que o paciente não deveria ler. Melhor recusar o
   * cupom com uma frase nossa — e é o cupom que está errado para esta compra,
   * não a compra.
   */
  if (cupom.tipo === "reservado" && aCobrar < 0.3) {
    await liberarReserva(cupom.reserva.redemptionId);
    return NextResponse.json(
      {
        error: "That code leaves an amount too small to charge. Ask the clinic for a full courtesy instead.",
        errorPt: "Esse código deixa um valor pequeno demais para cobrar. Peça à clínica uma cortesia total.",
        code: "amount_too_small",
      },
      { status: 409 }
    );
  }

  const base = process.env.NEXTAUTH_URL || "https://bpr.clinic";

  // Quem paga pelo app volta **para o app**. Apontar o retorno para o site
  // deixava a pessoa no Safari depois de pagar, tendo de achar sozinha o
  // caminho de volta — no meio de um pagamento (083). A rota da assinatura já
  // fazia assim; esta não fazia.
  const isMobile =
    req.headers.get("x-platform") === "mobile" ||
    req.nextUrl.searchParams.get("platform") === "mobile";

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: appointment.patient.email,
      // O webhook reconhece a consulta por aqui. Sem isto o pagamento entra e
      // ninguém sabe a que horário ele pertence.
      metadata: {
        appointmentId: appointment.id,
        patientId: userId,
        kind: String(appointment.kind),
        ...(cupom.tipo === "reservado"
          ? { couponCode: cupom.reserva.code, couponRedemptionId: cupom.reserva.redemptionId }
          : {}),
      },
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: appointment.treatmentType || "Consultation",
              description: new Date(appointment.dateTime).toLocaleString("en-GB"),
            },
            // O valor recalculado aqui, nunca o que a tela mostrou.
            unit_amount: Math.round(aCobrar * 100),
          },
          quantity: 1,
        },
      ],
      success_url: isMobile ? "bprclinic://appointments?status=success" : `${base}/dashboard/appointments?paid=1`,
      cancel_url: isMobile ? "bprclinic://appointments?status=cancelled" : `${base}/dashboard/appointments?cancelled=1`,
    });

    // A sessão nasceu: é por ela que o webhook acha o resgate.
    if (cupom.tipo === "reservado") await anexarSessao(cupom.reserva.redemptionId, session.id);

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    // A cobrança não nasceu, então a vaga volta — um resgate sem Checkout
    // consumiria o limite da campanha de graça.
    if (cupom.tipo === "reservado") await liberarReserva(cupom.reserva.redemptionId);
    console.error("[appointment-checkout]", e?.message);
    return NextResponse.json(
      {
        error: "Could not start the payment.",
        errorPt: "Não foi possível iniciar o pagamento.",
      },
      { status: 502 }
    );
  }
}
