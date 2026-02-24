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
    const { sessionId } = body ?? {};

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Retrieve the Stripe session
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

    if (!checkoutSession) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Find the payment by session ID
    const payment = await prisma.payment.findUnique({
      where: { stripeSessionId: sessionId },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Update payment based on Stripe session status
    if (checkoutSession.payment_status === "paid") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCEEDED",
          stripePaymentId: checkoutSession.payment_intent as string,
        },
      });

      // Update appointment status to confirmed
      await prisma.appointment.update({
        where: { id: payment.appointmentId },
        data: { status: "CONFIRMED" },
      });

      return NextResponse.json({
        success: true,
        status: "SUCCEEDED",
        message: "Payment verified successfully",
      });
    } else {
      return NextResponse.json({
        success: false,
        status: checkoutSession.payment_status,
        message: "Payment not completed",
      });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}
