import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { patientGate } from "@/lib/patient-gate";

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
      },
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: appointment.treatmentType || "Consultation",
              description: new Date(appointment.dateTime).toLocaleString("en-GB"),
            },
            unit_amount: Math.round(appointment.price * 100),
          },
          quantity: 1,
        },
      ],
      success_url: isMobile ? "bprclinic://appointments?status=success" : `${base}/dashboard/appointments?paid=1`,
      cancel_url: isMobile ? "bprclinic://appointments?status=cancelled" : `${base}/dashboard/appointments?cancelled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
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
