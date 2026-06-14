import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

// GET — return patient's wearable connections + last 7 days of data points
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await (prisma as any).user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Active connections
  const connections = await (prisma as any).wearableConnection.findMany({
    where:   { userId: user.id, status: "CONNECTED" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      provider: true,
      status: true,
      lastSyncedAt: true,
      terraUserId: true,
    },
  });

  // Last 30 days of data points
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceStr = since.toISOString().slice(0, 10);

  const dataPoints = await (prisma as any).wearableDataPoint.findMany({
    where:   { userId: user.id, dataDate: { gte: sinceStr } },
    orderBy: { dataDate: "desc" },
    select: {
      id: true,
      dataDate: true,
      dataType: true,
      provider: true,
      sleepScore: true,
      sleepDuration: true,
      remMinutes: true,
      deepMinutes: true,
      lightMinutes: true,
      sleepEfficiency: true,
      hrv: true,
      restingHr: true,
      hrvScore: true,
      bodyTemperature: true,
      spo2: true,
      steps: true,
      activeCalories: true,
      activeMinutes: true,
      stressScore: true,
    },
  });

  return NextResponse.json({ connections, dataPoints });
}
