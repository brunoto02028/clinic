export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const body = await request.json();
    const { appointmentId } = body ?? {};

    if (!appointmentId) {
      return NextResponse.json(
        { error: "Appointment ID is required" },
        { status: 400 }
      );
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        payment: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    if (appointment?.payment?.status === "SUCCEEDED") {
      return NextResponse.json(
        { error: "This appointment has already been paid for" },
        { status: 400 }
      );
    }

    const origin = request.headers.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const userId = (session.user as any).id;

    // Create or update payment record
    let payment = appointment.payment;

    if (!payment) {
      payment = await prisma.payment.create({
        data: {
          appointmentId,
          userId,
          amount: appointment.price,
          currency: "GBP",
          status: "PENDING",
        },
      });
    }

    const apptDate = new Date(appointment.dateTime);
    const apptDateStr = apptDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const apptTimeStr = apptDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const hoursUntil = (apptDate.getTime() - Date.now()) / (1000 * 60 * 60);
    const cancellationNote = hoursUntil >= 24
      ? "Free cancellation up to 24 hours before your appointment."
      : "This appointment is within 24 hours — 50% cancellation fee applies.";

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: appointment?.patient?.email ?? undefined,
      billing_address_collection: "required",
      phone_number_collection: { enabled: true },
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: appointment.treatmentType,
              description: `Appointment on ${apptDateStr} at ${apptTimeStr}\n\n${cancellationNote}`,
            },
            unit_amount: Math.round(appointment.price * 100),
          },
          quantity: 1,
        },
      ],
      custom_fields: [
        {
          key: "full_name",
          label: { type: "custom", custom: "Full Name" },
          type: "text",
          optional: false,
        },
      ],
      consent_collection: {
        terms_of_service: "required",
      },
      custom_text: {
        terms_of_service_acceptance: {
          message: `By completing this payment you agree to our [Cancellation Policy](${origin}/cancellation-policy): cancellations within 24 hours are subject to a 50% charge. You have 2 free reschedules per appointment. Treatment plans require admin review.`,
        },
        submit: { message: "Your payment is secured by Stripe. We'll send a confirmation email." },
      },
      metadata: {
        appointmentId,
        paymentId: payment.id,
        userId,
        type: "appointment",
        hoursUntilAppt: Math.round(hoursUntil).toString(),
      },
      success_url: `${origin}/dashboard/appointments/${appointmentId}?payment=success`,
      cancel_url: `${origin}/dashboard/appointments/${appointmentId}?payment=cancelled`,
    });

    // Update payment with Stripe session ID
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        stripeSessionId: checkoutSession.id,
      },
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create payment session" },
      { status: 500 }
    );
  }
}
