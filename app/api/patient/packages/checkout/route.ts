import { patientGate } from "@/lib/patient-gate";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from '@/lib/get-effective-user';
import Stripe from "stripe";
import { precoDoPacote } from "@/lib/package-price";
import {
  reservarCupom,
  anexarSessao,
  liberarReserva,
  cupomStripe,
  MINIMO_COBRAVEL,
  ABAIXO_DO_MINIMO,
  type ResultadoReserva,
} from "@/lib/coupon-redemption";

export const dynamic = "force-dynamic";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2024-06-20" as any });
}

// POST — Patient initiates payment for their package
export async function POST(req: NextRequest) {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate({ skipConsent: true });
  if (__gate.response) return __gate.response;

  // Fora do `try` porque o `catch` precisa devolver a vaga da campanha quando a
  // cobrança não nasce — e o `catch` não vê o que foi declarado dentro do `try`.
  let cupom: ResultadoReserva = { tipo: "sem_cupom" };

  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = effectiveUser.userId;
    const { packageId, couponCode } = await req.json();

    if (!packageId) {
      return NextResponse.json({ error: "packageId is required" }, { status: 400 });
    }

    const pkg = await (prisma as any).treatmentPackage.findUnique({
      where: { id: packageId },
      include: {
        patient: { select: { firstName: true, lastName: true, email: true } },
        protocol: { select: { title: true, estimatedWeeks: true } },
      },
    });

    if (!pkg || pkg.patientId !== userId) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    if (pkg.isPaid) {
      return NextResponse.json({ error: "Package already paid" }, { status: 400 });
    }

    const stripe = getStripe();
    const type = pkg.selectedPaymentType;

    // A conta saiu daqui para `lib/package-price.ts` (084, T-4): a prévia do
    // cupom faz a mesma pergunta, e duas implementações dela seriam a tela
    // prometendo um preço e esta rota cobrando outro.
    const preco = precoDoPacote(pkg);
    let amount = preco.amount * 100;
    const description = preco.description;

    /**
     * O cupom (084, T-4), recalculado aqui a partir do código.
     *
     * Na cobrança semanal o desconto **não** pode sair do `unit_amount`: isso
     * descontaria toda semana, para sempre. Ali ele entra como cupom da Stripe
     * com `duration: "once"` — vale na adesão, como diz a suposição 7 do plano.
     */
    cupom = pkg.clinicId
      ? await reservarCupom({
          clinicId: pkg.clinicId,
          patientId: userId,
          code: couponCode ?? null,
          scope: "PACKAGE",
          amount: preco.amount,
          currency: preco.currency,
          targetId: pkg.id,
          stripe,
        })
      : ({ tipo: "sem_cupom" } as const);

    if (cupom.tipo === "recusado") {
      return NextResponse.json(
        { error: cupom.recusa.message, errorPt: cupom.recusa.messagePt, reason: cupom.recusa.reason },
        { status: 409 }
      );
    }

    let descontos: { coupon: string }[] | undefined;
    if (cupom.tipo === "reservado") {
      if (preco.recurring) {
        try {
          descontos = [{ coupon: await cupomStripe(stripe as any, cupom.reserva) }];
        } catch (e: any) {
          await liberarReserva(cupom.reserva.redemptionId);
          console.error("[patient-checkout] cupom da Stripe:", e?.message);
          return NextResponse.json(
            { error: "We could not apply that code right now.", errorPt: "Não foi possível aplicar esse código agora." },
            { status: 502 }
          );
        }
      } else {
        amount = cupom.reserva.final * 100;
      }
    }

    /**
     * O cupom não pode deixar um valor que a Stripe não cobra — nem zero.
     *
     * Ao contrário da consulta, aqui não há caminho de "cortesia total": marcar
     * um pacote como pago envolve liberações que só o webhook faz hoje, e
     * duplicá-las por dedução seria pior que recusar. Então a cortesia de 100%
     * nestas duas compras é uma conversa com a clínica, não um cupom — e a frase
     * diz isso (A-2 do review, 26/09/2026).
     */
    // Só no caminho de cobrança única: na semanal o desconto vai por cupom da
    // Stripe e o valor unitário fica cheio, então a Stripe cuida do resto.
    if (cupom.tipo === "reservado" && !preco.recurring && cupom.reserva.final < MINIMO_COBRAVEL) {
      await liberarReserva(cupom.reserva.redemptionId);
      return NextResponse.json(
        { error: ABAIXO_DO_MINIMO.en, errorPt: ABAIXO_DO_MINIMO.pt, code: "amount_too_small" },
        { status: 409 }
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: type === "WEEKLY" ? "subscription" : "payment",
      customer_email: pkg.patient.email,
      metadata: {
        packageId: pkg.id,
        patientId: userId,
        paymentType: type,
        ...(cupom.tipo === "reservado"
          ? { couponCode: cupom.reserva.code, couponRedemptionId: cupom.reserva.redemptionId }
          : {}),
      },
      ...(descontos ? { discounts: descontos } : {}),
      ...(type === "WEEKLY" ? {
        subscription_data: {
          metadata: { packageId: pkg.id, patientId: userId, paymentType: type },
        },
      } : {}),
      line_items: [
        {
          price_data: {
            currency: pkg.currency.toLowerCase(),
            product_data: {
              name: description,
              description: `Patient: ${pkg.patient.firstName} ${pkg.patient.lastName}`,
            },
            unit_amount: Math.round(amount),
            ...(type === "WEEKLY" ? { recurring: { interval: "week" as const } } : {}),
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard/treatment?payment=success&packageId=${pkg.id}`,
      cancel_url: `${baseUrl}/dashboard/treatment?payment=cancelled`,
    });

    if (cupom.tipo === "reservado") await anexarSessao(cupom.reserva.redemptionId, checkoutSession.id);

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
    });
  } catch (err: any) {
    // A cobrança não nasceu: a vaga volta à campanha.
    if (cupom.tipo === "reservado") {
      await liberarReserva(cupom.reserva.redemptionId);
    }
    console.error("[patient-checkout] POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
