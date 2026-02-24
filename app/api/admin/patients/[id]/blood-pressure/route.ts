export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

// GET — admin view of a patient's BP readings
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== "ADMIN" && userRole !== "SUPERADMIN" && userRole !== "THERAPIST") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "90");
    const since = new Date();
    since.setDate(since.getDate() - days);

    const readings = await (prisma as any).bloodPressureReading.findMany({
      where: { patientId: id, measuredAt: { gte: since } },
      orderBy: { measuredAt: "desc" },
    });

    // Calculate stats
    if (readings.length > 0) {
      const avgSystolic = Math.round(readings.reduce((s: number, r: any) => s + r.systolic, 0) / readings.length);
      const avgDiastolic = Math.round(readings.reduce((s: number, r: any) => s + r.diastolic, 0) / readings.length);
      const avgHR = readings.filter((r: any) => r.heartRate).length > 0
        ? Math.round(readings.filter((r: any) => r.heartRate).reduce((s: number, r: any) => s + (r.heartRate || 0), 0) / readings.filter((r: any) => r.heartRate).length)
        : null;
      const latest = readings[0];

      return NextResponse.json({
        readings,
        stats: {
          count: readings.length,
          avgSystolic,
          avgDiastolic,
          avgHeartRate: avgHR,
          latest: { systolic: latest.systolic, diastolic: latest.diastolic, heartRate: latest.heartRate, measuredAt: latest.measuredAt },
        },
      });
    }

    return NextResponse.json({ readings: [], stats: null });
  } catch (error) {
    console.error("Error fetching patient BP readings:", error);
    return NextResponse.json({ error: "Failed to fetch readings" }, { status: 500 });
  }
}
