import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";

export const dynamic = "force-dynamic";

// GET — Patient's own protocols (sent to patient)
export async function GET(req: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

    const userId = effectiveUser.userId;

    const protocols = await (prisma as any).treatmentProtocol.findMany({
      where: {
        patientId: userId,
        status: "SENT_TO_PATIENT",
      },
      orderBy: { createdAt: "desc" },
      include: {
        therapist: { select: { firstName: true, lastName: true } },
        diagnosis: {
          select: {
            id: true,
            summary: true,
            conditions: true,
            references: true,
          },
        },
        packages: {
          select: {
            id: true,
            name: true,
            status: true,
            isPaid: true,
            paidAt: true,
            totalSessions: true,
            pricePerSession: true,
            priceFullPackage: true,
            selectedPaymentType: true,
            currency: true,
            consultationFee: true,
            sessionsCompleted: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        items: {
          orderBy: [{ phase: "asc" }, { sortOrder: "asc" }],
          include: {
            exercise: {
              select: {
                id: true,
                name: true,
                description: true,
                instructions: true,
                videoUrl: true,
                thumbnailUrl: true,
                defaultSets: true,
                defaultReps: true,
                defaultHoldSec: true,
                defaultRestSec: true,
              },
            },
          },
        },
      },
    });

    // For each protocol, check if payment is required
    const enriched = protocols.map((p: any) => {
      const pkg = p.packages?.[0];
      const paymentRequired = pkg && !pkg.isPaid;
      return {
        ...p,
        paymentRequired,
        activePackage: pkg || null,
        // If payment required, hide detailed items (only show summary)
        items: paymentRequired ? [] : p.items,
      };
    });

    return NextResponse.json({ protocols: enriched });
  } catch (err: any) {
    console.error("[patient-protocol] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — Patient marks item as completed
export async function PATCH(req: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

    const { itemId, completed, notes } = await req.json();
    if (!itemId) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }

    // Verify the item belongs to the patient
    const item = await (prisma as any).protocolItem.findUnique({
      where: { id: itemId },
      include: { protocol: { select: { patientId: true } } },
    });

    if (!item || item.protocol.patientId !== effectiveUser.userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (completed !== undefined) {
      updateData.isCompleted = completed;
      if (completed) {
        updateData.completedCount = { increment: 1 };
        updateData.lastCompletedAt = new Date();
      }
    }
    if (notes !== undefined) updateData.patientNotes = notes;

    const updated = await (prisma as any).protocolItem.update({
      where: { id: itemId },
      data: updateData,
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (err: any) {
    console.error("[patient-protocol] PATCH error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
