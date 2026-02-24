import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicContext, getClinicContextFromSession, getDefaultClinic } from "@/lib/clinic-context";
import { stripe } from "@/lib/stripe";

async function resolveClinicContext() {
  let ctx = await getClinicContext();
  if (!ctx.clinicId) ctx = await getClinicContextFromSession();
  if (!ctx.clinicId) {
    const clinic = await getDefaultClinic();
    if (clinic) ctx = { ...ctx, clinicId: clinic.id };
  }
  return ctx;
}

export async function GET() {
  try {
    const { clinicId, userRole } = await resolveClinicContext();
    if (!userRole || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const where: any = {};
    if (clinicId) where.clinicId = clinicId;

    const plans = await (prisma as any).treatmentPlan.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        therapist: { select: { id: true, firstName: true, lastName: true } },
        items: true,
        _count: { select: { appointments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(plans);
  } catch (error: any) {
    console.error("Error fetching treatment plans:", error);
    return NextResponse.json({ error: "Failed to fetch treatment plans" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { clinicId, userRole, userId } = await resolveClinicContext();
    if (!userRole || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!clinicId) {
      return NextResponse.json({ error: "No clinic found. Please configure a clinic first." }, { status: 400 });
    }

    const body = await request.json();
    const { patientId, patientScope, name, totalPrice, isFree, isCombo, totalSessions, notes, items, startDate, endDate } = body;

    if (!name) {
      return NextResponse.json({ error: "Plan name is required" }, { status: 400 });
    }
    // patientId is required only when scope is 'specific'
    if (patientScope === "specific" && !patientId) {
      return NextResponse.json({ error: "Please select a patient" }, { status: 400 });
    }

    const finalPrice = isFree ? 0 : (totalPrice || 0);
    const resolvedPatientId = (patientScope === "specific" && patientId) ? patientId : null;

    // Create Stripe product + price (only if not free and Stripe key exists)
    let stripeProductId: string | undefined;
    let stripePriceId: string | undefined;
    if (!isFree && finalPrice > 0 && process.env.STRIPE_SECRET_KEY) {
      try {
        const product = await stripe.products.create({
          name,
          description: `Treatment plan — ${(items || []).map((i: any) => `${i.treatmentName} (${i.sessions}x)`).join(', ')}`,
          metadata: { clinicId: clinicId!, patientId: resolvedPatientId || 'none', patientScope: patientScope || 'none', source: 'treatment_plan' },
        });
        stripeProductId = product.id;
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: Math.round(finalPrice * 100),
          currency: 'gbp',
          metadata: { clinicId: clinicId!, patientId: resolvedPatientId || 'none', patientScope: patientScope || 'none' },
        });
        stripePriceId = price.id;
      } catch (stripeErr: any) {
        console.error('[treatment-plans] Stripe error (non-fatal):', stripeErr.message);
      }
    }

    const plan = await (prisma as any).treatmentPlan.create({
      data: {
        clinicId,
        ...(resolvedPatientId ? { patientId: resolvedPatientId } : {}),
        therapistId: userId,
        name,
        totalPrice: finalPrice,
        isFree: isFree || false,
        isCombo: isCombo || false,
        totalSessions: totalSessions || 1,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        notes: notes || null,
        stripeProductId: stripeProductId || null,
        stripePriceId: stripePriceId || null,
        items: {
          create: (items || []).map((item: any) => ({
            treatmentName: item.treatmentName,
            type: item.type || "SINGLE",
            sessions: item.sessions || 1,
            unitPrice: item.unitPrice || 0,
            duration: item.duration || 60,
          })),
        },
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        therapist: { select: { id: true, firstName: true, lastName: true } },
        items: true,
      },
    });

    return NextResponse.json({ ...plan, stripeProductId, stripePriceId });
  } catch (error: any) {
    console.error("Error creating treatment plan:", error);
    return NextResponse.json({ error: "Failed to create treatment plan" }, { status: 500 });
  }
}
