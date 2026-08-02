export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";

// GET: patient's own waitlist entries
export async function GET() {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const entries = await (prisma as any).waitlistEntry.findMany({
      where: { patientId: effectiveUser.userId, status: { in: ["ACTIVE", "NOTIFIED"] } },
      include: {
        therapist: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ entries });
  } catch (err: any) {
    console.error("[patient-waitlist] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: join the waitlist for a treatment type
export async function POST(req: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { treatmentType, therapistId, preferredFrom, preferredTo, notes } = body;

    if (!treatmentType?.trim()) {
      return NextResponse.json({ error: "treatmentType is required." }, { status: 400 });
    }

    const patient = await prisma.user.findUnique({
      where: { id: effectiveUser.userId },
      select: { clinicId: true },
    });

    const existing = await (prisma as any).waitlistEntry.findFirst({
      where: {
        patientId: effectiveUser.userId,
        treatmentType,
        status: { in: ["ACTIVE", "NOTIFIED"] },
      },
    });
    if (existing) {
      return NextResponse.json({ error: "You're already on the waitlist for this treatment." }, { status: 400 });
    }

    const entry = await (prisma as any).waitlistEntry.create({
      data: {
        clinicId: patient?.clinicId ?? null,
        patientId: effectiveUser.userId,
        therapistId: therapistId || null,
        treatmentType,
        preferredFrom: preferredFrom ? new Date(preferredFrom) : null,
        preferredTo: preferredTo ? new Date(preferredTo) : null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, entry });
  } catch (err: any) {
    console.error("[patient-waitlist] POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: leave the waitlist
export async function DELETE(req: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const entry = await (prisma as any).waitlistEntry.findUnique({ where: { id } });
    if (!entry || entry.patientId !== effectiveUser.userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await (prisma as any).waitlistEntry.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[patient-waitlist] DELETE error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
