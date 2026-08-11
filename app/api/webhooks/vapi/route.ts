// ================================================================
// app/api/webhooks/vapi/route.ts
// Vapi Voice AI — Server Events Webhook
// Handles: tool-calls, end-of-call-report, call-started, transcript
// ================================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getVapiWebhookSecret } from "@/lib/vapi";
import { sendEmail } from "@/lib/email";
import { getAppName } from "@/lib/utils";
import { logBookedEventForEmail } from "@/lib/lead-magnet";

export const dynamic = "force-dynamic";

// ─── Tool: checkAvailability ─────────────────────────────────────────────────

async function handleCheckAvailability(args: { date: string }): Promise<string> {
  try {
    const { date } = args;
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();

    const therapist = await prisma.user.findFirst({
      where: { role: { in: ["ADMIN", "THERAPIST", "SUPERADMIN"] } },
    });

    if (!therapist) return "Sorry, no therapist is currently available.";

    const availability = await (prisma as any).therapistAvailability.findUnique({
      where: {
        therapistId_dayOfWeek: {
          therapistId: therapist.id,
          dayOfWeek,
        },
      },
    });

    if (!availability || !availability.isAvailable) {
      const dayName = dateObj.toLocaleDateString("en-GB", { weekday: "long" });
      return `Unfortunately, the clinic is not open on ${dayName}s. Would you like to try a different day?`;
    }

    const [startH, startM] = availability.startTime.split(":").map(Number);
    const [endH, endM] = availability.endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const intervalConfig = await prisma.systemConfig.findUnique({
      where: { key: "SLOT_INTERVAL_MINUTES" },
    });
    const slotInterval = intervalConfig ? parseInt(intervalConfig.value, 10) : 30;
    const duration = 60;

    const allSlots: string[] = [];
    for (let m = startMinutes; m + duration <= endMinutes; m += slotInterval) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      allSlots.push(`${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`);
    }

    const dayStart = new Date(date + "T00:00:00");
    const dayEnd = new Date(date + "T23:59:59");

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        therapistId: therapist.id,
        dateTime: { gte: dayStart, lte: dayEnd },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      select: { dateTime: true, duration: true },
    });

    const occupiedRanges = existingAppointments.map((a: any) => {
      const apptStart = a.dateTime.getHours() * 60 + a.dateTime.getMinutes();
      return { start: apptStart, end: apptStart + (a.duration || 60) };
    });

    const availableSlots = allSlots.filter((slot) => {
      const [sh, sm] = slot.split(":").map(Number);
      const slotStart = sh * 60 + sm;
      const slotEnd = slotStart + duration;
      return !occupiedRanges.some(
        (range: any) => slotStart < range.end && slotEnd > range.start
      );
    });

    if (availableSlots.length === 0) {
      const formatted = dateObj.toLocaleDateString("en-GB", {
        weekday: "long", day: "numeric", month: "long",
      });
      return `Unfortunately, we have no available slots on ${formatted}. Would you like to try another date?`;
    }

    const formatted = dateObj.toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long",
    });
    return `On ${formatted}, we have the following slots available: ${availableSlots.join(", ")}. Which time works best for you?`;
  } catch (err: any) {
    console.error("[vapi-webhook] checkAvailability error:", err);
    return "I'm sorry, I was unable to check availability right now. Please call back and we'll be happy to help.";
  }
}

// ─── Tool: bookAppointment ───────────────────────────────────────────────────

async function handleBookAppointment(
  args: {
    patientName: string;
    patientPhone: string;
    patientEmail?: string;
    dateTime: string;
    treatmentType: string;
    chiefComplaint?: string;
  },
  vapiCallId?: string
): Promise<string> {
  try {
    const { patientName, patientPhone, patientEmail, dateTime, treatmentType, chiefComplaint } = args;

    const nameParts = patientName.trim().split(" ");
    const firstName = nameParts[0] || "Guest";
    const lastName = nameParts.slice(1).join(" ") || "Patient";

    // Try to find existing patient by phone or email
    let patient = await prisma.user.findFirst({
      where: {
        OR: [
          ...(patientPhone ? [{ phone: patientPhone }] : []),
          ...(patientEmail ? [{ email: patientEmail }] : []),
        ],
        role: "PATIENT",
      },
    });

    // Create guest patient if not found
    if (!patient) {
      const guestEmail = patientEmail || `voice_guest_${Date.now()}@bpr.clinic`;
      const clinic = await prisma.clinic.findFirst({ where: { isActive: true } });

      patient = await prisma.user.create({
        data: {
          email: guestEmail,
          firstName,
          lastName,
          phone: patientPhone,
          role: "PATIENT",
          clinicId: clinic?.id || null,
          password: null,
        },
      });
    }

    // Find therapist
    const therapist = await prisma.user.findFirst({
      where: { role: { in: ["ADMIN", "THERAPIST", "SUPERADMIN"] } },
    });

    if (!therapist) return "I'm sorry, I was unable to complete the booking. Please call back and a member of the team will assist you.";

    const pricingMap: Record<string, number> = {
      "initial assessment": 70,
      "follow-up treatment": 60,
      "follow-up": 60,
      "sports massage": 55,
      "custom orthotics assessment": 80,
      "home visit": 90,
    };
    const priceKey = treatmentType.toLowerCase();
    const price = Object.entries(pricingMap).find(([k]) => priceKey.includes(k))?.[1] || 60;

    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        therapistId: therapist.id,
        dateTime: new Date(dateTime),
        duration: 60,
        treatmentType,
        notes: chiefComplaint ? `[Voice Booking] ${chiefComplaint}` : "[Voice Booking via AI Receptionist]",
        price,
        status: "PENDING",
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        therapist: { select: { firstName: true, lastName: true } },
      },
    });

    // Lead-magnet attribution (P3): log a "booked" event if this patient's
    // email was previously captured via an article lead-magnet.
    logBookedEventForEmail(appointment.patient.email).catch(() => {});

    // Update VapiCall record with appointment ID
    if (vapiCallId) {
      await (prisma as any).vapiCall.updateMany({
        where: { vapiCallId },
        data: {
          appointmentId: appointment.id,
          callerName: patientName,
          callerEmail: patientEmail || null,
          callerNotes: chiefComplaint || null,
          appointmentData: {
            dateTime,
            treatmentType,
            price,
            patientId: patient.id,
          },
        },
      });
    }

    // Send admin notification
    try {
      const apptDate = new Date(dateTime);
      const dateStr = apptDate.toLocaleDateString("en-GB", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });
      const timeStr = apptDate.toLocaleTimeString("en-GB", {
        hour: "2-digit", minute: "2-digit",
      });
      const appName = getAppName();
      const BASE = process.env.NEXTAUTH_URL || "https://bpr.clinic";

      await sendEmail({
        to: "brunotoaz@gmail.com",
        subject: `📞 Voice Booking: ${patientName} — ${treatmentType} on ${dateStr}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #607d7d; border-bottom: 2px solid #5dc9c0; padding-bottom: 10px;">
              📞 New Appointment via AI Receptionist
            </h2>
            <div style="background: #f0fdf4; border-left: 4px solid #5dc9c0; padding: 16px; margin: 16px 0; border-radius: 4px;">
              <p style="margin: 0; font-weight: bold;">This appointment was booked automatically by the AI phone receptionist.</p>
            </div>
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>Patient:</strong> ${patientName}</p>
              <p style="margin: 8px 0;"><strong>Phone:</strong> ${patientPhone}</p>
              ${patientEmail ? `<p style="margin: 8px 0;"><strong>Email:</strong> ${patientEmail}</p>` : ""}
              ${chiefComplaint ? `<p style="margin: 8px 0;"><strong>Chief Complaint:</strong> ${chiefComplaint}</p>` : ""}
              <p style="margin: 8px 0;"><strong>Treatment:</strong> ${treatmentType}</p>
              <p style="margin: 8px 0;"><strong>Date:</strong> ${dateStr}</p>
              <p style="margin: 8px 0;"><strong>Time:</strong> ${timeStr}</p>
              <p style="margin: 8px 0;"><strong>Price:</strong> £${price}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${BASE}/admin/calls" style="background: #5dc9c0; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; margin-right: 12px;">
                View Call Logs
              </a>
              <a href="${BASE}/admin/appointments" style="background: #607d7d; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                View Appointments
              </a>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("[vapi-webhook] Failed to send admin email:", emailErr);
    }

    const apptDate = new Date(dateTime);
    const dateStr = apptDate.toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long",
    });
    const timeStr = apptDate.toLocaleTimeString("en-GB", {
      hour: "2-digit", minute: "2-digit",
    });

    return `Perfect! I've booked a ${treatmentType} for ${patientName} on ${dateStr} at ${timeStr}. You'll receive a confirmation shortly. Is there anything else I can help you with?`;
  } catch (err: any) {
    console.error("[vapi-webhook] bookAppointment error:", err);
    return "I'm sorry, there was a problem completing the booking. The clinic team will be in touch to confirm your appointment.";
  }
}

// ─── Main webhook handler ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body?.message ?? body;
    const msgType: string = message?.type ?? "";

    // Webhook secret validation (required)
    const secret = getVapiWebhookSecret();
    if (!secret) {
      console.error("[vapi-webhook] VAPI_WEBHOOK_SECRET not configured — rejecting webhook");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }
    const authHeader = req.headers.get("x-vapi-secret");
    if (authHeader !== secret) {
      console.warn("[vapi-webhook] Invalid webhook secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Tool calls ────────────────────────────────────────────────────────────
    if (msgType === "tool-calls") {
      const toolCallList: any[] = message?.toolCallList ?? [];
      const callId: string = message?.call?.id ?? "";
      const results: { toolCallId: string; result: string }[] = [];

      for (const toolCall of toolCallList) {
        const name: string = toolCall?.function?.name ?? "";
        let rawArgs: any = {};
        try {
          rawArgs = typeof toolCall?.function?.arguments === "string"
            ? JSON.parse(toolCall.function.arguments)
            : toolCall?.function?.arguments ?? {};
        } catch {
          rawArgs = {};
        }

        let result = "";
        if (name === "checkAvailability") {
          result = await handleCheckAvailability(rawArgs);
        } else if (name === "bookAppointment") {
          result = await handleBookAppointment(rawArgs, callId);
        } else {
          result = "Tool not available.";
        }

        results.push({ toolCallId: toolCall.id, result });
      }

      return NextResponse.json({ results });
    }

    // ── Call started ──────────────────────────────────────────────────────────
    if (msgType === "call-started" || msgType === "status-update") {
      const call = message?.call ?? message;
      const vapiCallId: string = call?.id ?? "";
      const phoneNumber: string =
        call?.customer?.number ?? call?.phoneNumber?.number ?? "";

      if (vapiCallId) {
        const clinic = await prisma.clinic.findFirst({ where: { isActive: true } });
        await (prisma as any).vapiCall.upsert({
          where: { vapiCallId },
          create: {
            vapiCallId,
            clinicId: clinic?.id ?? null,
            phoneNumber,
            status: "in-progress",
            direction: call?.type === "outboundPhoneCall" ? "outbound" : "inbound",
            startedAt: call?.startedAt ? new Date(call.startedAt) : new Date(),
          },
          update: { status: "in-progress" },
        });
      }

      return NextResponse.json({ received: true });
    }

    // ── End of call report ────────────────────────────────────────────────────
    if (msgType === "end-of-call-report") {
      const call = message?.call ?? {};
      const artifact = message?.artifact ?? {};
      const vapiCallId: string = call?.id ?? "";
      const phoneNumber: string =
        call?.customer?.number ?? call?.phoneNumber?.number ?? "";
      const endedReason: string = message?.endedReason ?? call?.endedReason ?? "";
      const transcript: string = artifact?.transcript ?? "";
      const summary: string = message?.analysis?.summary ?? artifact?.summary ?? "";
      const recordingUrl: string = artifact?.recordingUrl ?? "";
      const costUsd: number | undefined = message?.cost ?? undefined;

      const startedAt = call?.startedAt ? new Date(call.startedAt) : null;
      const endedAt = call?.endedAt ? new Date(call.endedAt) : new Date();
      const durationSec =
        startedAt && endedAt
          ? Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)
          : null;

      if (vapiCallId) {
        const clinic = await prisma.clinic.findFirst({ where: { isActive: true } });
        await (prisma as any).vapiCall.upsert({
          where: { vapiCallId },
          create: {
            vapiCallId,
            clinicId: clinic?.id ?? null,
            phoneNumber,
            status: "ended",
            direction: call?.type === "outboundPhoneCall" ? "outbound" : "inbound",
            startedAt,
            endedAt,
            durationSec,
            endedReason,
            transcript,
            summary,
            recordingUrl: recordingUrl || null,
            costUsd: costUsd ?? null,
          },
          update: {
            status: "ended",
            endedAt,
            durationSec,
            endedReason,
            transcript,
            summary,
            recordingUrl: recordingUrl || null,
            costUsd: costUsd ?? null,
          },
        });
      }

      return NextResponse.json({ received: true });
    }

    // ── Other events (transcript chunks, etc.) ────────────────────────────────
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[vapi-webhook] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
