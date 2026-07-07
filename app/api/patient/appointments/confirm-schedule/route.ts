import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/patient/appointments/confirm-schedule
// Converts all PENDING_PATIENT appointments → CONFIRMED for this patient
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "PATIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const patientId = (session.user as any).id;

    const result = await (prisma as any).appointment.updateMany({
      where: { patientId, status: "PENDING_PATIENT" },
      data: { status: "CONFIRMED" },
    });

    return NextResponse.json({ confirmed: result.count });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
