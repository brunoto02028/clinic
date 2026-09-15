import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { assertModuleAccess } from "@/lib/module-access";
import { AccessError, accessErrorResponse } from "@/lib/tenant-access";

export const dynamic = "force-dynamic";

// GET — Patient's own protocols (sent to patient)
export async function GET(req: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

    const userId = effectiveUser.userId;
    if (effectiveUser.role === "PATIENT") {
      await assertModuleAccess(userId, "mod_treatment");
    }

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
                namePt: true,
                descriptionPt: true,
                instructionsPt: true,
                videoUrl: true,
                thumbnailUrl: true,
                // Without this the treatment screen's player had no way to know
                // the clip should be silent, and played it with sound.
                muteForPatient: true,
                defaultSets: true,
                defaultReps: true,
                defaultHoldSec: true,
                defaultRestSec: true,
              },
            },
            // Last 14 days is enough for the current week's strip (activity 42)
            // — the patient view never needs older history than that.
            completionLogs: {
              where: { completedDate: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
              select: { completedDate: true },
            },
          },
        },
      },
    });

    // For each protocol, check payment + apply visibility rules
    const enriched = protocols.map((p: any) => {
      const pkg = p.packages?.[0];
      const paymentRequired = pkg && !pkg.isPaid;
      // Visibility: exclude items hidden by the therapist and items beyond the released window
      let visibleItems = (p.items || []).filter((it: any) => !it.hiddenFromPatient);
      if (p.releasedThroughWeek != null) {
        visibleItems = visibleItems.filter((it: any) => (it.startWeek || 1) <= p.releasedThroughWeek);
      }
      const hasMoreComing = p.releasedThroughWeek != null
        && (p.items || []).some((it: any) => !it.hiddenFromPatient && (it.startWeek || 1) > p.releasedThroughWeek);
      return {
        ...p,
        paymentRequired,
        activePackage: pkg || null,
        hasMoreComing, // patient UI can show "your specialist releases the plan progressively"
        // If payment required, hide detailed items (only show summary)
        items: paymentRequired ? [] : visibleItems,
      };
    });

    return NextResponse.json({ protocols: enriched });
  } catch (err: any) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[patient-protocol] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — Patient toggles "did it today" (or a given date) for one item
// (activity 42 — see specs/42-protocolo-semanal-checklist-diario).
export async function POST(req: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

    if (effectiveUser.role === "PATIENT") {
      await assertModuleAccess(effectiveUser.userId, "mod_treatment");
    }

    const body = await req.json();
    if (body.action !== "toggleLog") {
      return NextResponse.json({ error: "Invalid action. Use: toggleLog" }, { status: 400 });
    }

    const { itemId, date } = body;
    if (!itemId) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }

    const item = await (prisma as any).protocolItem.findUnique({
      where: { id: itemId },
      include: { protocol: { select: { patientId: true } } },
    });
    if (!item || item.protocol.patientId !== effectiveUser.userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Truncate to a bare date (no time) — Europe/London, matching the clinic.
    // Given as YYYY-MM-DD from the client when marking a day in the current
    // week's strip; defaults to "today" in that timezone otherwise.
    const dateStr = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date
      : new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" }); // en-CA gives YYYY-MM-DD
    const completedDate = new Date(`${dateStr}T00:00:00.000Z`);

    const existing = await (prisma as any).exerciseCompletionLog.findUnique({
      where: { protocolItemId_patientId_completedDate: { protocolItemId: itemId, patientId: effectiveUser.userId, completedDate } },
    });

    if (existing) {
      await (prisma as any).exerciseCompletionLog.delete({ where: { id: existing.id } });
    } else {
      await (prisma as any).exerciseCompletionLog.create({
        data: { protocolItemId: itemId, patientId: effectiveUser.userId, completedDate },
      });
    }

    // completedCount/isCompleted/lastCompletedAt derive from the actual log
    // rows after every toggle — an independent increment-only counter would
    // drift the moment a day gets unmarked (stayed "Done 1x" and checked
    // off forever even with zero days actually marked).
    const remaining = await (prisma as any).exerciseCompletionLog.findMany({
      where: { protocolItemId: itemId, patientId: effectiveUser.userId },
      orderBy: { completedDate: "desc" },
      select: { completedDate: true },
    });
    await (prisma as any).protocolItem.update({
      where: { id: itemId },
      data: {
        completedCount: remaining.length,
        isCompleted: remaining.length > 0,
        lastCompletedAt: remaining[0]?.completedDate || null,
      },
    });

    return NextResponse.json({ success: true, marked: !existing, date: dateStr });
  } catch (err: any) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[patient-protocol] POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — Patient marks item as completed
export async function PATCH(req: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

    if (effectiveUser.role === "PATIENT") {
      await assertModuleAccess(effectiveUser.userId, "mod_treatment");
    }

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
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[patient-protocol] PATCH error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
