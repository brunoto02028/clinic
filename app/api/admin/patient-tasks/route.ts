import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyPatient } from "@/lib/notify-patient";
import { pushTarefa } from "@/lib/push-notify";
import { getSessionStaffActor } from "@/lib/tenant-access";

export const dynamic = "force-dynamic";

// Tasks belong to the caller's tenant only (activity 52, T-5): this listed —
// and "send to all" reached — every patient on the platform, the same class as
// the 11/09 broadcast leak.
const MAX_LIMIT = 200;

// An action link is internal: a task carries the studio's/clinic's name, so an
// external URL here would be phishing under their brand. A plain "/" prefix
// isn't enough — browsers read "/\host", "/<tab>/host" or "/<newline>/host" as
// "//host" — so no backslash, whitespace or control character anywhere.
function isSafeActionUrl(url: unknown): boolean {
  if (typeof url !== "string" || !url.startsWith("/") || url.startsWith("//")) return false;
  for (const ch of url) {
    const code = ch.charCodeAt(0);
    if (ch === "\\" || code <= 0x20 || code === 0x7f) return false;
  }
  return true;
}

// GET — List tasks of this tenant (with filters)
export async function GET(req: NextRequest) {
  const actor = await getSessionStaffActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!actor.clinicId) return NextResponse.json({ error: "No tenant resolved for this account" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "all";
  const patientId = searchParams.get("patientId");
  const requested = parseInt(searchParams.get("limit") || "50", 10);
  const limit = Math.min(Number.isFinite(requested) && requested > 0 ? requested : 50, MAX_LIMIT);

  // PatientTask has no patient relation to filter through, and rows written
  // before clinicId existed carry none — so scope by the tenant's own patients.
  const tenantPatients = await prisma.user.findMany({
    where: { role: "PATIENT", clinicId: actor.clinicId },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  const tenantIds = tenantPatients.map((p) => p.id);

  const where: any = { patientId: patientId ? (tenantIds.includes(patientId) ? patientId : "") : { in: tenantIds } };
  if (status !== "all") where.status = status;

  const tasks = await (prisma as any).patientTask.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const patients = tenantPatients;
  const patientMap = Object.fromEntries(patients.map((p) => [p.id, p]));

  const enriched = tasks.map((t: any) => ({
    ...t,
    patient: patientMap[t.patientId] || null,
  }));

  return NextResponse.json({ tasks: enriched });
}

// POST — Create a new task for a patient of this tenant (and auto-notify)
export async function POST(req: NextRequest) {
  const actor = await getSessionStaffActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!actor.clinicId) return NextResponse.json({ error: "No tenant resolved for this account" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const {
    patientId,
    patientIds,
    audience = "one", // "one" | "selected" | "all"
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

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (actionUrl !== undefined && actionUrl !== null && actionUrl !== "" && !isSafeActionUrl(actionUrl)) {
    return NextResponse.json({ error: "actionUrl must be an internal path" }, { status: 400 });
  }

  // Resolve target patients — always within the caller's tenant.
  const tenantPatients = { role: "PATIENT" as const, clinicId: actor.clinicId };
  let targetIds: string[] = [];
  if (audience === "all") {
    const all = await prisma.user.findMany({
      where: { ...tenantPatients, isActive: true },
      select: { id: true },
    });
    targetIds = all.map((p) => p.id);
  } else {
    const asked = audience === "selected"
      ? (Array.isArray(patientIds) ? patientIds : [])
      : (patientId ? [patientId] : []);
    const found = await prisma.user.findMany({
      where: { ...tenantPatients, id: { in: asked } },
      select: { id: true },
    });
    // An id from another tenant is refused outright, not silently dropped.
    if (found.length !== new Set(asked).size) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    targetIds = found.map((p) => p.id);
  }

  if (!targetIds.length) {
    return NextResponse.json({ error: "No target patients" }, { status: 400 });
  }

  const adminId = actor.userId;
  const clinicId = actor.clinicId;
  const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString("en-GB") : "";
  const plainMessage = `You have a new action required: "${title}"${dueDateStr ? ` — due by ${dueDateStr}` : ""}. Please check your dashboard.`;
  const plainMessagePt = `Você tem uma nova ação necessária: "${titlePt || title}"${dueDateStr ? ` — prazo: ${dueDateStr}` : ""}. Verifique seu painel.`;

  const created: any[] = [];
  let notified = 0;

  for (const pid of targetIds) {
    const task = await (prisma as any).patientTask.create({
      data: {
        clinicId,
        patientId: pid,
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
    created.push(task);

    try {
      await notifyPatient({
        patientId: pid,
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
      notified++;
      await (prisma as any).patientTask.update({
        where: { id: task.id },
        data: { emailSent: true, emailSentAt: new Date() },
      });
      // Este push existia desde antes, mandando para uma API do Firebase
      // desligada — ou seja, nunca chegou a lugar nenhum. Ao fazer o push
      // voltar a funcionar (077), ele passou a **chegar**, e com três defeitos:
      // levava o título da tarefa verbatim ("Sign consent for the knee joint
      // injection") para a tela bloqueada, falava português com paciente
      // inglês, e apontava para uma rota da web que o app não tem.
      //
      // Agora ele usa o mesmo caminho dos outros quatro avisos: texto neutro,
      // idioma do paciente, rota do app. O que é a tarefa fica dentro do app.
      await pushTarefa(pid);
    } catch (err) {
      console.error(`[patient-tasks] Failed to notify patient ${pid}:`, err);
    }
  }

  return NextResponse.json(
    { task: created[0], count: created.length, notified, emailSent: notified > 0 },
    { status: 201 }
  );
}
