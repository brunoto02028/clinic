import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateHealthState, getHealthState, sysLog } from "@/lib/system-logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {};

  // 1. Database connectivity
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "ok", latency: Date.now() - dbStart };
  } catch (err: any) {
    checks.database = { status: "error", error: err.message?.substring(0, 200) };
  }

  // 2. Memory usage
  const mem = process.memoryUsage();
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
  const rssMB = Math.round(mem.rss / 1024 / 1024);
  checks.memory = {
    status: heapUsedMB > 512 ? "warn" : "ok",
    latency: heapUsedMB,
  };

  // 3. Uptime
  const uptimeSeconds = Math.floor(process.uptime());

  const allOk = Object.values(checks).every((c) => c.status === "ok");
  updateHealthState(allOk);

  // Log if unhealthy
  if (!allOk) {
    const failedChecks = Object.entries(checks)
      .filter(([, v]) => v.status !== "ok")
      .map(([k]) => k);
    sysLog.warn(`Health check degraded: ${failedChecks.join(", ")}`, {
      category: "SCHEDULED",
      source: "health-check",
      details: checks,
    });
  }

  const totalLatency = Date.now() - start;

  const healthState = getHealthState();

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: uptimeSeconds,
      latency: totalLatency,
      checks,
      memory: {
        heapUsedMB,
        heapTotalMB,
        rssMB,
      },
      consecutiveFailures: healthState.consecutiveFailures,
    },
    { status: allOk ? 200 : 503 }
  );
}
