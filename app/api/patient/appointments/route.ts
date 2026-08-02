import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/patient/appointments?status=PENDING_PATIENT
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "PATIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const patientId = (session.user as any).id;
    const status = req.nextUrl.searchParams.get("status");

    const where: any = { patientId };
    if (status) where.status = status;

    const appointments = await (prisma as any).appointment.findMany({
      where,
      orderBy: { dateTime: "asc" },
      select: {
        id: true,
        dateTime: true,
        duration: true,
        treatmentType: true,
        status: true,
        notes: true,
        protocolId: true,
      },
    });

    return NextResponse.json({ appointments });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
