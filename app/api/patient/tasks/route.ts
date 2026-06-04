import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";

export const dynamic = "force-dynamic";

// GET — List patient's own pending/active tasks
export async function GET(req: NextRequest) {
  const effective = await getEffectiveUser();
  if (!effective) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "active"; // active = pending + in_progress

  const where: any = { patientId: effective.userId };
  if (status === "active") {
    where.status = { in: ["pending", "in_progress"] };
  } else if (status !== "all") {
    where.status = status;
  }

  const tasks = await (prisma as any).patientTask.findMany({
    where,
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  // Sort by priority weight
  const priorityWeight: Record<string, number> = { urgent: 4, high: 3, normal: 2, low: 1 };
  tasks.sort((a: any, b: any) => (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0));

  return NextResponse.json({ tasks, count: tasks.length });
}

// PATCH — Patient marks task as completed or in_progress
export async function PATCH(req: NextRequest) {
  const effective = await getEffectiveUser();
  if (!effective) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId, status } = await req.json();

  if (!taskId || !status) {
    return NextResponse.json({ error: "taskId and status required" }, { status: 400 });
  }

  if (!["in_progress", "completed"].includes(status)) {
    return NextResponse.json({ error: "Invalid status. Use: in_progress, completed" }, { status: 400 });
  }

  // Verify task belongs to patient
  const task = await (prisma as any).patientTask.findFirst({
    where: { id: taskId, patientId: effective.userId },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const updated = await (prisma as any).patientTask.update({
    where: { id: taskId },
    data: {
      status,
      completedAt: status === "completed" ? new Date() : null,
    },
  });

  return NextResponse.json({ task: updated });
}
