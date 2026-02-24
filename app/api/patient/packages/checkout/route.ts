import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from '@/lib/get-effective-user';
import Stripe from "stripe";

export const dynamic = "force-dynamic";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2024-06-20" as any });
}

// POST — Patient initiates payment for their package
export async function POST(req: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = effectiveUser.userId;
    const { packageId } = await req.json();

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

    let amount: number;
    let description: string;

    switch (type) {
      case "PER_SESSION":
        amount = (pkg.pricePerSession + (pkg.consultationFee / pkg.totalSessions)) * 100;
        description = `${pkg.name} — Single Session`;
        break;
      case "WEEKLY":
        const weeklyPrice = pkg.pricePerWeek || (pkg.pricePerSession * (pkg.totalSessions / (pkg.protocol?.estimatedWeeks || 12)));
        amount = (weeklyPrice + (pkg.consultationFee / (pkg.protocol?.estimatedWeeks || 12))) * 100;
        description = `${pkg.name} — Weekly Payment`;
        break;
      case "FULL_PACKAGE":
      default:
        const fullPrice = pkg.priceFullPackage || (pkg.pricePerSession * pkg.totalSessions);
        amount = (fullPrice + pkg.consultationFee) * 100;
        description = `${pkg.name} — Full Package`;
        break;
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
      },
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

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
    });
  } catch (err: any) {
    console.error("[patient-checkout] POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
