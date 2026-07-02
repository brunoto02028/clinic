import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { rehabChat, summarisePlan, PatientContext } from "@/lib/rehab-agent";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["ADMIN", "SUPERADMIN", "STAFF"];

// POST /api/admin/patients/[id]/rehab-plan/[planId]/chat
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; planId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const plan = await (prisma as any).rehabPlan.findFirst({
    where: { id: params.planId, patientId: params.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  // Save user message
  await (prisma as any).rehabMessage.create({
    data: { planId: params.planId, role: "user", content: message },
  });

  // Build history for agent
  const history = plan.messages.map((m: any) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  history.push({ role: "user", content: message });

  const patientCtx: PatientContext = {
    chiefComplaint: plan.chiefComplaint,
    bodyPart: plan.bodyPart,
    severity: plan.severity as any,
    phase: plan.phase as any,
  };

  try {
    const reply = await rehabChat(history, patientCtx, summarisePlan(plan.planJson as any));

    // Save assistant reply
    const saved = await (prisma as any).rehabMessage.create({
      data: { planId: params.planId, role: "assistant", content: reply },
    });

    return NextResponse.json({ reply, messageId: saved.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
