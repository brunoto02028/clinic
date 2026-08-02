export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { notifyWaitlistForCancelledAppointment } from "@/lib/waitlist";

// GET: list waitlist entries (admin)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userClinicId = (session.user as any).clinicId;
    const userRole = (session.user as any).role;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const clinicFilter = searchParams.get("clinicId");

    const where: any = {};
    if (status) where.status = status;
    const effectiveClinicId = clinicFilter || (userRole !== "SUPERADMIN" ? userClinicId : null);
    if (effectiveClinicId) where.clinicId = effectiveClinicId;

    const entries = await (prisma as any).waitlistEntry.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        therapist: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ entries });
  } catch (err: any) {
    console.error("[admin-waitlist] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: admin adds a patient to the waitlist manually, or triggers a manual re-notify
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // action: "renotify" — manually trigger matching against a hypothetical freed slot
    if (action === "renotify") {
      const { treatmentType, therapistId, dateTime, clinicId } = body;
      if (!treatmentType || !dateTime) {
        return NextResponse.json({ error: "treatmentType and dateTime are required" }, { status: 400 });
      }
      const result = await notifyWaitlistForCancelledAppointment({
        id: "manual",
        clinicId: clinicId || (session.user as any).clinicId || null,
        therapistId: therapistId || "",
        treatmentType,
        dateTime: new Date(dateTime),
      });
      return NextResponse.json({ success: true, ...result });
    }

    // Default: create a manual waitlist entry for a patient
    const { patientId, treatmentType, therapistId, preferredFrom, preferredTo, notes, clinicId } = body;
    if (!patientId || !treatmentType?.trim()) {
      return NextResponse.json({ error: "patientId and treatmentType are required" }, { status: 400 });
    }

    const patient = await prisma.user.findUnique({ where: { id: patientId }, select: { clinicId: true } });
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    const entry = await (prisma as any).waitlistEntry.create({
      data: {
        clinicId: clinicId || patient.clinicId || null,
        patientId,
        therapistId: therapistId || null,
        treatmentType,
        preferredFrom: preferredFrom ? new Date(preferredFrom) : null,
        preferredTo: preferredTo ? new Date(preferredTo) : null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, entry });
  } catch (err: any) {
    console.error("[admin-waitlist] POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: remove/cancel a waitlist entry
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    await (prisma as any).waitlistEntry.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[admin-waitlist] DELETE error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
