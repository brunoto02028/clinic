import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { notifyPatient } from "@/lib/notify-patient";

export const dynamic = "force-dynamic";

// GET — List tasks created by admin (with filters)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "all";
  const patientId = searchParams.get("patientId");
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  const where: any = {};
  if (status !== "all") where.status = status;
  if (patientId) where.patientId = patientId;

  const tasks = await (prisma as any).patientTask.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Enrich with patient names
  const patientIds = [...new Set(tasks.map((t: any) => t.patientId))];
  const patients = await prisma.user.findMany({
    where: { id: { in: patientIds as string[] } },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  const patientMap = Object.fromEntries(patients.map((p) => [p.id, p]));

  const enriched = tasks.map((t: any) => ({
    ...t,
    patient: patientMap[t.patientId] || null,
  }));

  return NextResponse.json({ tasks: enriched });
}

// POST — Create a new task for a patient (and auto-notify)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    patientId,
    type = "CUSTOM",
    title,
    titlePt,
    description,
    descriptionPt,
    priority = "normal",
    dueDate,
    actionUrl,
    metadata,
  } = body;

  if (!patientId || !title) {
    return NextResponse.json({ error: "patientId and title are required" }, { status: 400 });
  }

  const adminId = (session.user as any).id;

  // Create the task
  const task = await (prisma as any).patientTask.create({
    data: {
      clinicId: (session.user as any).clinicId || null,
      patientId,
      createdById: adminId,
      type,
      title,
      titlePt: titlePt || null,
      description: description || null,
      descriptionPt: descriptionPt || null,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      actionUrl: actionUrl || null,
      metadata: metadata || null,
      status: "pending",
    },
  });

  // Auto-notify patient via email + preferred channel
  let emailSent = false;
  try {
    const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString("en-GB") : "";
    const plainMessage = `You have a new action required: "${title}"${dueDateStr ? ` — due by ${dueDateStr}` : ""}. Please check your dashboard.`;
    const plainMessagePt = `Você tem uma nova ação necessária: "${titlePt || title}"${dueDateStr ? ` — prazo: ${dueDateStr}` : ""}. Verifique seu painel.`;

    await notifyPatient({
      patientId,
      emailTemplateSlug: "PATIENT_TASK_CREATED",
      emailVars: {
        taskTitle: title,
        taskDescription: description || "",
        dueDate: dueDateStr,
        actionUrl: actionUrl || "/dashboard/tasks",
      },
      plainMessage,
      plainMessagePt,
    });

    emailSent = true;
    await (prisma as any).patientTask.update({
      where: { id: task.id },
      data: { emailSent: true, emailSentAt: new Date() },
    });
  } catch (err) {
    console.error("[patient-tasks] Failed to notify patient:", err);
  }

  return NextResponse.json({ task, emailSent }, { status: 201 });
}
