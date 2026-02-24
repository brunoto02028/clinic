import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// ─── GET — List packages for a patient ───
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patientId = params.id;
    const packages = await (prisma as any).treatmentPackage.findMany({
      where: { patientId },
      include: {
        protocol: {
          select: { id: true, title: true, summary: true, estimatedWeeks: true, totalSessions: true },
        },
        patient: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ packages });
  } catch (err: any) {
    console.error("[packages] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST — Create a financial package from a protocol ───
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patientId = params.id;
    const clinicId = (session.user as any).clinicId;
    const body = await req.json();

    const {
      protocolId,
      name,
      description,
      totalSessions,
      sessionDuration,
      currency,
      pricePerSession,
      pricePerWeek,
      priceFullPackage,
      selectedPaymentType,
      consultationFee,
      inClinicSessions,
      remoteSessions,
      homeVisitSessions,
    } = body;

    if (!protocolId) {
      return NextResponse.json({ error: "protocolId is required" }, { status: 400 });
    }

    // Verify protocol exists
    const protocol = await (prisma as any).treatmentProtocol.findUnique({
      where: { id: protocolId },
    });
    if (!protocol) {
      return NextResponse.json({ error: "Protocol not found" }, { status: 404 });
    }

    const pkg = await (prisma as any).treatmentPackage.create({
      data: {
        clinicId: clinicId || "",
        protocolId,
        patientId,
        name: name || `${protocol.title} — Package`,
        description: description || null,
        totalSessions: totalSessions || protocol.totalSessions || 12,
        sessionDuration: sessionDuration || 60,
        currency: currency || "GBP",
        pricePerSession: pricePerSession || 60,
        pricePerWeek: pricePerWeek || null,
        priceFullPackage: priceFullPackage || null,
        selectedPaymentType: selectedPaymentType || "FULL_PACKAGE",
        consultationFee: consultationFee || 0,
        inClinicSessions: inClinicSessions || 0,
        remoteSessions: remoteSessions || 0,
        homeVisitSessions: homeVisitSessions || 0,
        status: "DRAFT",
      },
      include: {
        protocol: { select: { id: true, title: true } },
        patient: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, package: pkg }, { status: 201 });
  } catch (err: any) {
    console.error("[packages] POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── PATCH — Update package (edit, send, mark paid) ───
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { packageId } = body;

    if (!packageId) {
      return NextResponse.json({ error: "packageId is required" }, { status: 400 });
    }

    const updateData: any = {};

    // Status transitions
    if (body.status) {
      updateData.status = body.status;
      if (body.status === "SENT") updateData.sentToPatientAt = new Date();
      if (body.status === "PAID") {
        updateData.isPaid = true;
        updateData.paidAt = new Date();
        if (body.paidAmount) updateData.paidAmount = body.paidAmount;
        if (body.paymentMethod) updateData.paymentMethod = body.paymentMethod;
      }
      if (body.status === "ACTIVE") updateData.activatedAt = new Date();
      if (body.status === "COMPLETED") updateData.completedAt = new Date();
    }

    // Editable fields
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.totalSessions !== undefined) updateData.totalSessions = body.totalSessions;
    if (body.sessionDuration !== undefined) updateData.sessionDuration = body.sessionDuration;
    if (body.pricePerSession !== undefined) updateData.pricePerSession = body.pricePerSession;
    if (body.pricePerWeek !== undefined) updateData.pricePerWeek = body.pricePerWeek;
    if (body.priceFullPackage !== undefined) updateData.priceFullPackage = body.priceFullPackage;
    if (body.selectedPaymentType !== undefined) updateData.selectedPaymentType = body.selectedPaymentType;
    if (body.consultationFee !== undefined) updateData.consultationFee = body.consultationFee;
    if (body.inClinicSessions !== undefined) updateData.inClinicSessions = body.inClinicSessions;
    if (body.remoteSessions !== undefined) updateData.remoteSessions = body.remoteSessions;
    if (body.homeVisitSessions !== undefined) updateData.homeVisitSessions = body.homeVisitSessions;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.sessionsCompleted !== undefined) updateData.sessionsCompleted = body.sessionsCompleted;
    if (body.nextSessionDate !== undefined) updateData.nextSessionDate = new Date(body.nextSessionDate);

    // Stripe fields
    if (body.stripePaymentIntentId !== undefined) updateData.stripePaymentIntentId = body.stripePaymentIntentId;
    if (body.stripeInvoiceId !== undefined) updateData.stripeInvoiceId = body.stripeInvoiceId;
    if (body.stripeSubscriptionId !== undefined) updateData.stripeSubscriptionId = body.stripeSubscriptionId;

    const updated = await (prisma as any).treatmentPackage.update({
      where: { id: packageId },
      data: updateData,
      include: {
        protocol: { select: { id: true, title: true } },
        patient: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, package: updated });
  } catch (err: any) {
    console.error("[packages] PATCH error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
