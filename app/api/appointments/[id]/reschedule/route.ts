export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { stripe } from "@/lib/stripe";
import { notifyPatient } from "@/lib/notify-patient";

const FREE_RESCHEDULES = 2;
const RESCHEDULE_FEE_PERCENT = 0.25; // 25% of appointment price after free reschedules

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const userId = effectiveUser.userId;
    const userRole = effectiveUser.role;
    const body = await request.json();
    const { newDateTime } = body;

    if (!newDateTime) {
      return NextResponse.json({ error: "newDateTime is required" }, { status: 400 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        therapist: { select: { id: true, firstName: true, lastName: true } },
        payment: true,
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Patients can only reschedule their own appointments
    if (userRole === "PATIENT" && appointment.patientId !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Can't reschedule cancelled or completed appointments
    if (appointment.status === "CANCELLED" || appointment.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Cannot reschedule a cancelled or completed appointment" },
        { status: 400 }
      );
    }

    const currentCount = appointment.rescheduleCount || 0;
    const isFree = currentCount < FREE_RESCHEDULES;
    const rescheduleFee = isFree ? 0 : Math.round(appointment.price * RESCHEDULE_FEE_PERCENT * 100) / 100;

    // Admin/therapist can always reschedule for free
    const isStaff = ["ADMIN", "SUPERADMIN", "THERAPIST"].includes(userRole);

    if (!isStaff && !isFree) {
      // Patient has exceeded free reschedules — need to charge
      const origin = request.headers.get("origin") || process.env.NEXTAUTH_URL || "https://bpr.rehab";

      // Create a Stripe checkout session for the reschedule fee
      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: appointment.patient?.email ?? undefined,
        line_items: [
          {
            price_data: {
              currency: "gbp",
              product_data: {
                name: `Reschedule Fee — ${appointment.treatmentType}`,
                description: `Reschedule fee (reschedule #${currentCount + 1}). First ${FREE_RESCHEDULES} reschedules are free.`,
              },
              unit_amount: Math.round(rescheduleFee * 100),
            },
            quantity: 1,
          },
        ],
        metadata: {
          appointmentId: id,
          userId,
          type: "reschedule_fee",
          newDateTime,
          rescheduleNumber: String(currentCount + 1),
        },
        success_url: `${origin}/dashboard/appointments/${id}?reschedule=success&newDateTime=${encodeURIComponent(newDateTime)}`,
        cancel_url: `${origin}/dashboard/appointments/${id}?reschedule=cancelled`,
      });

      return NextResponse.json({
        success: false,
        requiresPayment: true,
        rescheduleFee,
        rescheduleNumber: currentCount + 1,
        freeReschedulesUsed: currentCount,
        checkoutUrl: checkoutSession.url,
        message: `You have used all ${FREE_RESCHEDULES} free reschedules. A fee of £${rescheduleFee.toFixed(2)} (25% of appointment price) is required to reschedule.`,
      });
    }

    // Perform the reschedule
    const newDate = new Date(newDateTime);
    const oldDate = new Date(appointment.dateTime);

    await prisma.appointment.update({
      where: { id },
      data: {
        dateTime: newDate,
        rescheduleCount: currentCount + 1,
        lastRescheduledAt: new Date(),
        status: "CONFIRMED", // Reset status on reschedule
      },
    });

    // Notify patient
    const BASE = process.env.NEXTAUTH_URL || "https://bpr.rehab";
    const newDateStr = newDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const newTimeStr = newDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const oldDateStr = oldDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const oldTimeStr = oldDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

    notifyPatient({
      patientId: appointment.patientId,
      emailTemplateSlug: "APPOINTMENT_CONFIRMATION",
      emailVars: {
        patientName: `${appointment.patient?.firstName} ${appointment.patient?.lastName}`,
        appointmentDate: newDateStr,
        appointmentTime: newTimeStr,
        therapistName: `${appointment.therapist?.firstName} ${appointment.therapist?.lastName}`,
        treatmentType: appointment.treatmentType || "",
        duration: String(appointment.duration || 60),
        portalUrl: `${BASE}/dashboard/appointments/${id}`,
      },
      plainMessage: `Your appointment has been rescheduled from ${oldDateStr} at ${oldTimeStr} to ${newDateStr} at ${newTimeStr}. Reschedule ${currentCount + 1}/${FREE_RESCHEDULES} free reschedules used.`,
      plainMessagePt: `Sua consulta foi reagendada de ${oldDateStr} às ${oldTimeStr} para ${newDateStr} às ${newTimeStr}. Reagendamento ${currentCount + 1}/${FREE_RESCHEDULES} gratuitos utilizados.`,
    }).catch((err) => console.error("[reschedule] notification error:", err));

    return NextResponse.json({
      success: true,
      rescheduleNumber: currentCount + 1,
      freeReschedulesRemaining: Math.max(0, FREE_RESCHEDULES - (currentCount + 1)),
      oldDateTime: oldDate.toISOString(),
      newDateTime: newDate.toISOString(),
      message: isFree
        ? `Appointment rescheduled successfully. You have ${Math.max(0, FREE_RESCHEDULES - (currentCount + 1))} free reschedule(s) remaining.`
        : `Appointment rescheduled successfully (staff override).`,
    });
  } catch (error: any) {
    console.error("[reschedule] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to reschedule" }, { status: 500 });
  }
}
