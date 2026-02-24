import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard/evolution — Compare latest vs previous body assessment score
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id;

    const assessments = await (prisma as any).bodyAssessment.findMany({
      where: { patientId: userId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: 2,
      select: { overallScore: true, createdAt: true },
    });

    if (assessments.length === 0) {
      return NextResponse.json({ change: 0, trend: "stagnant", hasData: false });
    }

    if (assessments.length === 1) {
      return NextResponse.json({ change: 0, trend: "stagnant", hasData: true, latest: assessments[0].overallScore });
    }

    const latest = assessments[0].overallScore || 0;
    const previous = assessments[1].overallScore || 0;
    const change = latest - previous;
    const trend = change > 2 ? "up" : change < -2 ? "down" : "stagnant";

    return NextResponse.json({ change: Math.round(change), trend, hasData: true, latest, previous });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
