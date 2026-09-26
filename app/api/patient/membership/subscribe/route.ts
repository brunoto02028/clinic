import { patientGate } from "@/lib/patient-gate";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from '@/lib/get-effective-user';
import { reservarCupom, anexarSessao, liberarReserva, cupomStripe } from "@/lib/coupon-redemption";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

// Map module feature keys to ServiceType enum values
const MODULE_TO_SERVICE: Record<string, string> = {
  mod_body_assessments: "BODY_ASSESSMENT",
  mod_foot_scans: "FOOT_SCAN",
  mod_appointments: "CONSULTATION",
};

/** Create ServiceAccess records for plan features so the AssessmentGate also grants access */
async function syncServiceAccessForPlan(patientId: string, plan: any, adminId?: string) {
  for (const featureKey of (plan.features || [])) {
    const svcType = MODULE_TO_SERVICE[featureKey];
    if (!svcType) continue;
    const existing = await (prisma as any).serviceAccess.findFirst({
      where: { patientId, serviceType: svcType },
    });
    if (existing) {
      if (!existing.granted) {
        await (prisma as any).serviceAccess.update({
          where: { id: existing.id },
          data: { granted: true, grantedById: adminId || null },
        });
      }
    } else {
      await (prisma as any).serviceAccess.create({
        data: {
          patientId,
          serviceType: svcType,
          granted: true,
          grantedById: adminId || null,
        },
      });
    }
  }
}

/**
 * POST /api/patient/membership/subscribe
 * Subscribe the patient to a membership plan.
 * - Free plans: activate immediately
 * - Paid plans: create Stripe Checkout session and return URL
 */
export async function POST(request: NextRequest) {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate({ skipConsent: true });
  if (__gate.response) return __gate.response;

  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = effectiveUser.userId;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, clinicId: true } });
    const userEmail = user?.email || '';
    const clinicId = user?.clinicId || null;
    const { planId, couponCode } = await request.json();

    if (!planId) {
      return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
    }

    // Fetch the plan
    const plan = await (prisma as any).membershipPlan.findUnique({
      where: { id: planId },
    });

    // Only a plan of the patient's own tenant that is offered to them — to
    // everyone, or to them specifically (activity 52, T-6). A draft ("none")
    // or someone else's plan was subscribable by id.
    const offeredToMe = plan && (plan.patientScope === "all" || (plan.patientScope === "specific" && plan.patientId === userId));
    if (!plan || plan.status !== "ACTIVE" || !clinicId || plan.clinicId !== clinicId || !offeredToMe) {
      return NextResponse.json({ error: "Plan not found or inactive" }, { status: 404 });
    }

    // Check if patient already has an active subscription
    const existingSub = await (prisma as any).patientSubscription.findFirst({
      where: { patientId: userId, status: { in: ["ACTIVE", "TRIALING"] } },
    });

    if (existingSub) {
      return NextResponse.json({ error: "You already have an active subscription. Please cancel it first to switch plans." }, { status: 400 });
    }

    // ── Free plan: activate immediately ──
    if (plan.isFree || plan.price === 0) {
      const subscription = await (prisma as any).patientSubscription.create({
        data: {
          clinicId: clinicId || plan.clinicId,
          patientId: userId,
          planId: plan.id,
          status: "ACTIVE",
          startDate: new Date(),
        },
      });

      // Sync ServiceAccess records for the plan's features
      await syncServiceAccessForPlan(userId, plan);

      return NextResponse.json({
        subscription,
        planName: plan.name,
        message: "Free membership activated successfully",
      });
    }

    // ── Paid plan: create Stripe Checkout ──
    // A paid plan whose Stripe price is missing used to be activated for free
    // ("manual payment mode") — it must be paid, so refuse instead (activity 52, T-6).
    if (!plan.stripePriceId || !process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "This plan can't be purchased online right now. Please contact the clinic." },
        { status: 409 }
      );
    }

    // Create Stripe Checkout Session for recurring subscription
    const BASE_URL = process.env.NEXTAUTH_URL || "https://bpr.clinic";
    const isMobile = request.headers.get("x-platform") === "mobile"
      || request.nextUrl.searchParams.get("platform") === "mobile";

    const successUrl = isMobile
      ? "bprclinic://membership?status=success"
      : `${BASE_URL}/dashboard/membership?success=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = isMobile
      ? "bprclinic://membership?status=cancelled"
      : `${BASE_URL}/dashboard/membership?cancelled=true`;

    /**
     * O cupom (084, T-4).
     *
     * Recalculado aqui a partir do **código**: a prévia da T-3 é uma tela.
     * Recusa devolve 409 com o motivo — não ativa a assinatura sem desconto por
     * conta própria, porque quem digitou um código escolheu aquele preço e
     * merece a chance de desistir.
     */
    const cupom = clinicId
      ? await reservarCupom({
          clinicId,
          patientId: userId,
          code: couponCode ?? null,
          scope: "MEMBERSHIP",
          amount: plan.price,
          currency: "GBP",
          targetId: plan.id,
          stripe,
        })
      : ({ tipo: "sem_cupom" } as const);

    if (cupom.tipo === "recusado") {
      return NextResponse.json(
        { error: cupom.recusa.message, errorPt: cupom.recusa.messagePt, reason: cupom.recusa.reason },
        { status: 409 }
      );
    }

    // A assinatura usa um `price` do catálogo da Stripe, então o desconto entra
    // como cupom deles — não dá para mandar um `unit_amount` já descontado.
    let descontos: { coupon: string }[] | undefined;
    if (cupom.tipo === "reservado") {
      try {
        descontos = [{ coupon: await cupomStripe(stripe as any, cupom.reserva) }];
      } catch (e: any) {
        await liberarReserva(cupom.reserva.redemptionId);
        console.error("[membership/subscribe] cupom da Stripe:", e?.message);
        return NextResponse.json(
          {
            error: "We could not apply that code right now. Please try again.",
            errorPt: "Não foi possível aplicar esse código agora. Tente de novo.",
          },
          { status: 502 }
        );
      }
    }

    let checkoutSession;
    try {
      checkoutSession = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer_email: userEmail,
        line_items: [{ price: plan.stripePriceId, quantity: 1 }],
        ...(descontos ? { discounts: descontos } : {}),
        metadata: {
          patientId: userId,
          planId: plan.id,
          clinicId: clinicId || plan.clinicId,
          type: "membership_subscription",
          ...(cupom.tipo === "reservado"
            ? { couponCode: cupom.reserva.code, couponRedemptionId: cupom.reserva.redemptionId }
            : {}),
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
    } catch (e: any) {
      // A cobrança não nasceu: a vaga volta à campanha.
      if (cupom.tipo === "reservado") await liberarReserva(cupom.reserva.redemptionId);
      throw e;
    }

    if (cupom.tipo === "reservado") await anexarSessao(cupom.reserva.redemptionId, checkoutSession.id);

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error: any) {
    console.error("[patient/membership/subscribe] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to subscribe" }, { status: 500 });
  }
}
