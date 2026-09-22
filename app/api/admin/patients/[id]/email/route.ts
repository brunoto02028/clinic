export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guardEmailAccess } from "@/lib/patient-email-server";
import { maskEmail } from "@/lib/patient-email";

// GET — composer context + the e-mails already sent to this patient (activity 68)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const g = await guardEmailAccess(request, params.id);
    if (g.response) return g.response;

    const [sent, appointments] = await Promise.all([
      prisma.patientOutboundEmail.findMany({
        where: { patientId: params.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { sentBy: { select: { firstName: true, lastName: true } } },
      }),
      prisma.appointment.findMany({
        where: { patientId: params.id, status: { notIn: ["CANCELLED"] } },
        orderBy: { dateTime: "desc" },
        take: 8,
        select: { id: true, dateTime: true, duration: true, treatmentType: true, status: true },
      }),
    ]);

    return NextResponse.json({
      patient: {
        firstName: g.patient.firstName,
        hasEmail: !!g.patient.email,
        toMasked: g.patient.email ? maskEmail(g.patient.email) : null,
        preferredLocale: g.patient.preferredLocale || "en-GB",
        address: g.patient.address,
      },
      appointments,
      sent,
    });
  } catch (error) {
    console.error("[patient-email] GET error:", error);
    return NextResponse.json({ error: "Failed to load e-mail history" }, { status: 500 });
  }
}
