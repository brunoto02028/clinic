import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET — Admin dashboard for voice transcription costs
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (!["SUPERADMIN", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const clinicId = (session.user as any).clinicId;
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "month"; // month, week, all

    // Date filter
    const now = new Date();
    let dateFrom: Date;
    switch (period) {
      case "week":
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "all":
        dateFrom = new Date("2020-01-01");
        break;
      default: // month
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const where: any = { createdAt: { gte: dateFrom } };
    if (clinicId && role !== "SUPERADMIN") {
      where.clinicId = clinicId;
    }

    // Get all transcriptions for the period
    const transcriptions = await (prisma as any).voiceTranscription.findMany({
      where,
      select: {
        id: true,
        patientId: true,
        audioDurationSec: true,
        language: true,
        context: true,
        apiCostUsd: true,
        totalCostUsd: true,
        createdAt: true,
        patient: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Aggregate stats
    const totalTranscriptions = transcriptions.length;
    const totalDurationSec = transcriptions.reduce((sum: number, t: any) => sum + t.audioDurationSec, 0);
    const totalApiCostUsd = transcriptions.reduce((sum: number, t: any) => sum + t.apiCostUsd, 0);
    const totalCostWithMargin = transcriptions.reduce((sum: number, t: any) => sum + t.totalCostUsd, 0);

    // Per-patient breakdown
    const byPatient: Record<string, { name: string; email: string; count: number; durationSec: number; costUsd: number }> = {};
    for (const t of transcriptions) {
      if (!byPatient[t.patientId]) {
        byPatient[t.patientId] = {
          name: `${t.patient.firstName} ${t.patient.lastName}`,
          email: t.patient.email,
          count: 0,
          durationSec: 0,
          costUsd: 0,
        };
      }
      byPatient[t.patientId].count++;
      byPatient[t.patientId].durationSec += t.audioDurationSec;
      byPatient[t.patientId].costUsd += t.totalCostUsd;
    }

    // By context breakdown
    const byContext: Record<string, { count: number; costUsd: number }> = {};
    for (const t of transcriptions) {
      if (!byContext[t.context]) {
        byContext[t.context] = { count: 0, costUsd: 0 };
      }
      byContext[t.context].count++;
      byContext[t.context].costUsd += t.totalCostUsd;
    }

    return NextResponse.json({
      period,
      summary: {
        totalTranscriptions,
        totalDurationMin: Math.round(totalDurationSec / 60 * 10) / 10,
        totalApiCostUsd: Math.round(totalApiCostUsd * 100) / 100,
        totalCostWithMargin: Math.round(totalCostWithMargin * 100) / 100,
        avgCostPerPatient: totalTranscriptions > 0
          ? Math.round((totalCostWithMargin / Object.keys(byPatient).length) * 100) / 100
          : 0,
        avgCostPerTranscription: totalTranscriptions > 0
          ? Math.round((totalCostWithMargin / totalTranscriptions) * 100) / 100
          : 0,
      },
      byPatient: Object.entries(byPatient)
        .map(([id, data]) => ({ patientId: id, ...data, costUsd: Math.round(data.costUsd * 100) / 100 }))
        .sort((a, b) => b.costUsd - a.costUsd),
      byContext: Object.entries(byContext)
        .map(([ctx, data]) => ({ context: ctx, ...data, costUsd: Math.round(data.costUsd * 100) / 100 }))
        .sort((a, b) => b.count - a.count),
      recentTranscriptions: transcriptions.slice(0, 20).map((t: any) => ({
        id: t.id,
        patientName: `${t.patient.firstName} ${t.patient.lastName}`,
        durationSec: t.audioDurationSec,
        context: t.context,
        language: t.language,
        costUsd: Math.round(t.totalCostUsd * 100) / 100,
        createdAt: t.createdAt,
      })),
    });
  } catch (err: any) {
    console.error("[voice-costs] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
