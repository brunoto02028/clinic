export const dynamic = 'force-dynamic';

import { patientGate } from "@/lib/patient-gate";
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import { getEffectiveUser } from '@/lib/get-effective-user';
import {
  reservarCupom,
  anexarSessao,
  liberarReserva,
  cupomStripe,
  MINIMO_COBRAVEL,
  ABAIXO_DO_MINIMO,
  type ResultadoReserva,
} from "@/lib/coupon-redemption";

export async function POST(req: NextRequest) {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate({ skipConsent: true });
  if (__gate.response) return __gate.response;

  // Fora do `try` porque o `catch` precisa devolver a vaga da campanha quando a
  // cobrança não nasce — e o `catch` não vê o que foi declarado dentro do `try`.
  let cupom: ResultadoReserva = { tipo: "sem_cupom" };

  try {
    const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const patientId = effectiveUser.userId;
    const body = await req.json();
    const { treatmentPlanId, couponCode } = body;

    if (!treatmentPlanId) {
      return NextResponse.json({ error: 'treatmentPlanId is required' }, { status: 400 });
    }

    const plan = await (prisma as any).treatmentPlan.findUnique({
      where: { id: treatmentPlanId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        items: true,
      },
    });

    if (!plan) return NextResponse.json({ error: 'Treatment plan not found' }, { status: 404 });
    if (plan.patientId !== patientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    if (plan.isFree || plan.totalPrice === 0) return NextResponse.json({ error: 'This plan is free — no payment required' }, { status: 400 });

    /**
     * O cupom (084, T-4), recalculado aqui a partir do código.
     *
     * Quando o plano tem `stripePriceId`, o item vem do catálogo da Stripe e o
     * desconto não cabe num `unit_amount` — entra como cupom deles. No item
     * inline, desconta-se o valor direto.
     */
    cupom = await reservarCupom({
      clinicId: plan.clinicId,
      patientId,
      code: couponCode ?? null,
      scope: "TREATMENT_PLAN",
      amount: plan.totalPrice,
      currency: "GBP",
      targetId: treatmentPlanId,
      stripe,
    });

    if (cupom.tipo === "recusado") {
      return NextResponse.json(
        { error: cupom.recusa.message, errorPt: cupom.recusa.messagePt, reason: cupom.recusa.reason },
        { status: 409 }
      );
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
    if (cupom.tipo === "reservado" && cupom.reserva.final < MINIMO_COBRAVEL) {
      await liberarReserva(cupom.reserva.redemptionId);
      return NextResponse.json(
        { error: ABAIXO_DO_MINIMO.en, errorPt: ABAIXO_DO_MINIMO.pt, code: "amount_too_small" },
        { status: 409 }
      );
    }

    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'https://bpr.clinic';

    // Build line items description
    const itemsDesc = plan.items
      .map((i: any) => `${i.treatmentName} × ${i.sessions} session${i.sessions > 1 ? 's' : ''}`)
      .join(', ');

    // Use existing Stripe price if available, otherwise create inline
    let lineItems: any[];
    let descontos: { coupon: string }[] | undefined;
    if (plan.stripePriceId) {
      lineItems = [{ price: plan.stripePriceId, quantity: 1 }];
      if (cupom.tipo === "reservado") {
        try {
          descontos = [{ coupon: await cupomStripe(stripe as any, cupom.reserva) }];
        } catch (e: any) {
          await liberarReserva(cupom.reserva.redemptionId);
          console.error('[treatment-plan-checkout] cupom da Stripe:', e?.message);
          return NextResponse.json(
            { error: 'We could not apply that code right now.', errorPt: 'Não foi possível aplicar esse código agora.' },
            { status: 502 }
          );
        }
      }
    } else {
      lineItems = [{
        price_data: {
          currency: 'gbp',
          product_data: {
            name: plan.name,
            description: itemsDesc || `Treatment plan — ${plan.totalSessions} session${plan.totalSessions > 1 ? 's' : ''}`,
            metadata: { treatmentPlanId, source: 'treatment_plan' },
          },
          // O valor recalculado aqui, nunca o que a tela mostrou.
          unit_amount: Math.round((cupom.tipo === "reservado" ? cupom.reserva.final : plan.totalPrice) * 100),
        },
        quantity: 1,
      }];
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: plan.patient?.email ?? undefined,
      billing_address_collection: 'required',
      phone_number_collection: { enabled: true },
      line_items: lineItems,
      custom_fields: [
        {
          key: 'full_name',
          label: { type: 'custom', custom: 'Full Name' },
          type: 'text',
          optional: false,
        },
      ],
      consent_collection: {
        terms_of_service: 'required',
      },
      custom_text: {
        terms_of_service_acceptance: {
          message: `By completing this payment you agree to our [Cancellation Policy](${origin}/cancellation-policy): Treatment plan cancellations require admin review. Once appointment slots are reserved, refunds are subject to our cancellation policy. Appointments cancelled within 48 hours of the scheduled time are non-refundable.`,
        },
        submit: {
          message: "Your payment is secured by Stripe. We'll send a confirmation email with your treatment plan details.",
        },
        after_submit: {
          message: 'Thank you! Your treatment plan is now active. Our team will contact you to schedule your sessions.',
        },
      },
      metadata: {
        treatmentPlanId,
        patientId,
        type: 'treatment_plan',
        planName: plan.name,
        ...(cupom.tipo === 'reservado'
          ? { couponCode: cupom.reserva.code, couponRedemptionId: cupom.reserva.redemptionId }
          : {}),
      },
      ...(descontos ? { discounts: descontos } : {}),
      success_url: `${origin}/dashboard/treatment?payment=success&planId=${treatmentPlanId}`,
      cancel_url: `${origin}/dashboard/treatment?payment=cancelled`,
    });

    if (cupom.tipo === "reservado") await anexarSessao(cupom.reserva.redemptionId, checkoutSession.id);

    // Record that policy was accepted at checkout creation time
    await (prisma as any).treatmentPlan.update({
      where: { id: treatmentPlanId },
      data: { cancellationPolicyAcceptedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (err: any) {
    // A cobrança não nasceu: a vaga volta à campanha.
    if (cupom.tipo === 'reservado') {
      await liberarReserva(cupom.reserva.redemptionId);
    }
    console.error('[treatment-plan-checkout] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
