import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyPatient } from "@/lib/notify-patient";
import { sendPushToUsers, countPushDevices } from "@/lib/push-send";
import { pickForPatient, groupByLang } from "@/lib/patient-language";
import { dispatchDueBroadcasts } from "@/lib/broadcast-dispatch";
import { getActor, requireStaff, tenantWhere, accessErrorResponse, AccessError } from "@/lib/tenant-access";

export const dynamic = "force-dynamic";

// SECURITY: every query below is scoped to the caller's own tenant (clinicId).
// Before this fix, GET/POST/DELETE had no tenant filter at all — any staff
// member of ANY clinic/studio could read every tenant's broadcast history,
// send a broadcast to every PATIENT row in the whole database regardless of
// tenant, and delete another tenant's broadcasts. ClinicBroadcast/ClinicMessage
// already had a nullable clinicId column that was simply never set/filtered.

// GET — broadcast history with read stats (own tenant only)
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requireStaff(actor);
    const { clinicId } = tenantWhere(actor);

    // Lazy-dispatch any scheduled broadcasts that are due (global maintenance
    // step — dispatchDueBroadcasts scopes each broadcast's recipients to its
    // OWN clinicId internally, not to this caller's tenant).
    await dispatchDueBroadcasts().catch(() => {});

    const broadcasts = await (prisma as any).clinicBroadcast.findMany({
      where: { clinicId },
      include: {
      sentBy: { select: { firstName: true, lastName: true } },
      messages: { select: { id: true, readAt: true, patient: { select: { firstName: true, lastName: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const result = broadcasts.map((b: any) => ({
    id: b.id,
    title: b.title,
    content: b.content,
    audience: b.audience,
    status: b.status,
    scheduledFor: b.scheduledFor,
    recipientCount: b.recipientCount,
    readCount: b.messages.filter((m: any) => m.readAt).length,
    recipients: b.messages.map((m: any) => ({
      name: `${m.patient.firstName} ${m.patient.lastName}`,
      read: Boolean(m.readAt),
    })),
    sentBy: `${b.sentBy.firstName} ${b.sentBy.lastName}`,
    createdAt: b.createdAt,
    // Nulo quando o aviso foi só no app. Dois broadcasts vinham
    // indistinguíveis, e uma falha do serviço não deixava rastro nenhum.
    pushSent: b.pushSent ?? null,
    pushFailed: b.pushFailed ?? null,
  }));

  return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/broadcasts] GET error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// GET ?devices=1 — quantos aparelhos receberiam agora. É o número que a prévia
// mostra, e ele nunca é igual ao de pacientes: quem não instalou o app, ou
// desligou o aviso, não está aqui. Mesma regra de tenant do resto do arquivo.
export async function PATCH(req: NextRequest) {
  try {
    const actor = await getActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requireStaff(actor);
    const { clinicId } = tenantWhere(actor);

    const { audience = "all", patientIds = [] } = await req.json().catch(() => ({}));
    const where: any = { role: "PATIENT", clinicId };
    if (audience === "selected") where.id = { in: patientIds };

    const patients = await prisma.user.findMany({ where, select: { id: true } });
    const devices = await countPushDevices(patients.map((p) => p.id));

    return NextResponse.json({ patients: patients.length, devices });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// POST — send a broadcast to all or selected patients of the CALLER'S tenant only.
export async function POST(req: NextRequest) {
  try {
    const actor = await getActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requireStaff(actor);
    const { clinicId } = tenantWhere(actor);

    const {
      title, content, audience = "all", patientIds = [], notify = true, scheduledFor,
      // A segunda versão. Inglês é a língua primária e o que todo mundo recebe
      // quando isto vem vazio; quem tem `preferredLocale` pt-BR recebe esta.
      titlePt = null, contentPt = null,
      // O aviso no celular. Desligado por omissão: push não tem desfazer, e o
      // caminho silencioso tem que ser o mais conservador.
      pushNotify = false,
    } = await req.json();
    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "title and content required" }, { status: 400 });
    }
    if (audience === "selected" && !patientIds.length) {
      return NextResponse.json({ error: "patientIds required for selected audience" }, { status: 400 });
    }

    // Scheduled for the future — store and dispatch later
    if (scheduledFor && new Date(scheduledFor) > new Date()) {
      const scheduled = await (prisma as any).clinicBroadcast.create({
        data: {
          clinicId,
          title: title.trim(),
          content: content.trim(),
          sentById: actor.userId,
          audience,
          titlePt: titlePt?.trim() || null,
          contentPt: contentPt?.trim() || null,
          status: "scheduled",
          scheduledFor: new Date(scheduledFor),
          targetIds: audience === "selected" ? patientIds : [],
        },
      });
      return NextResponse.json(
        { id: scheduled.id, scheduled: true, scheduledFor: scheduled.scheduledFor },
        { status: 201 }
      );
    }

    // Resolve recipients — scoped to this tenant. `selected` ids from another
    // tenant are silently excluded rather than trusted from client input.
    const where: any = { role: "PATIENT", clinicId };
    if (audience === "selected") where.id = { in: patientIds };
    const patients = await prisma.user.findMany({
      where,
      // `preferredLocale` entra aqui porque o texto é escolhido por paciente,
      // não por envio.
      select: { id: true, preferredLocale: true },
    });

    if (!patients.length) {
      return NextResponse.json({ error: "No recipients found" }, { status: 400 });
    }

    const senderId = actor.userId;

    const broadcast = await (prisma as any).clinicBroadcast.create({
      data: {
        clinicId,
        title: title.trim(),
        content: content.trim(),
        sentById: senderId,
        audience,
        titlePt: titlePt?.trim() || null,
        contentPt: contentPt?.trim() || null,
        recipientCount: patients.length,
        status: "sent",
        sentAt: new Date(),
      },
    });

    // Fan-out: uma ClinicMessage por destinatário, **já na língua dele**.
    // O texto resolvido é guardado em cada linha, e não escolhido na leitura:
    // se o paciente trocar de idioma depois, a mensagem que ele recebeu
    // continua sendo a que recebeu.
    const bilingue = { title: title.trim(), content: content.trim(), titlePt, contentPt };
    await (prisma as any).clinicMessage.createMany({
      data: patients.map((p) => {
        const texto = pickForPatient(bilingue, p.preferredLocale);
        return {
          clinicId,
          patientId: p.id,
          senderId,
          senderRole: "staff",
          kind: "broadcast",
          title: texto.title,
          content: texto.content,
          broadcastId: broadcast.id,
        };
      }),
    });

    // Notify each patient (email/WhatsApp per preference) — fire-and-forget
    if (notify) {
      const appUrl = process.env.NEXTAUTH_URL || "https://bpr.clinic";
      const preview = content.trim().slice(0, 100);
      Promise.allSettled(
        patients.map((p) =>
          notifyPatient({
            patientId: p.id,
            plainMessage: `Notice from your clinic — ${title.trim()}: "${preview}" Read in your portal: ${appUrl}/dashboard/questions`,
            plainMessagePt: `Aviso da sua clínica — ${title.trim()}: "${preview}" Leia no portal: ${appUrl}/dashboard/questions`,
          })
        )
      ).catch(() => {});
    }

    // O toque no ombro de quem tem o app. Vai **depois** das mensagens: a
    // mensagem é o registro, o push é só o aviso de que ela existe — e quem
    // estava sem celular, sem app ou com o aviso desligado encontra tudo
    // quando abrir (077, T-4).
    let push: { sent: number; failed: number; deactivated: number; error?: string } | null = null;
    if (pushNotify) {
      // Dois envios, um por língua: o serviço da Expo leva um texto por lote, e
      // mandar inglês para quem só lê português seria pior que não mandar.
      const grupos = groupByLang(patients);
      const enviar = (ids: string[], t: { title: string | null; content: string }) =>
        ids.length === 0
          ? Promise.resolve({ sent: 0, failed: 0, deactivated: 0 })
          : sendPushToUsers(ids, {
              title: t.title || title.trim(),
              // O corpo é o texto do aviso, cortado. A notificação aparece na
              // tela bloqueada, então aqui não entra nada além do que a clínica
              // escolheu escrever para todo mundo ver.
              body: t.content.slice(0, 140),
              url: "/(app)/(clinica)/messages",
            });

      const [emIngles, emPortugues] = await Promise.all([
        enviar(grupos.en.map((p) => p.id), pickForPatient(bilingue, "en-GB")),
        enviar(grupos.pt.map((p) => p.id), pickForPatient(bilingue, "pt-BR")),
      ]);

      push = {
        sent: emIngles.sent + emPortugues.sent,
        failed: emIngles.failed + emPortugues.failed,
        deactivated: emIngles.deactivated + emPortugues.deactivated,
        error: emIngles.error || emPortugues.error,
      };
    }

    // O resultado fica no registro, e não só no toast: recarregar a página
    // perdia os números, e uma falha inteira do serviço não deixava rastro.
    if (push) {
      await (prisma as any).clinicBroadcast.update({
        where: { id: broadcast.id },
        data: { pushSent: push.sent, pushFailed: push.failed },
      }).catch(() => {});
    }

    return NextResponse.json(
      { id: broadcast.id, recipientCount: patients.length, push },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/broadcasts] POST error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// DELETE — remove a broadcast (and its fan-out messages). Ownership is checked
// server-side: a broadcastId from another tenant answers 404, never deletes.
export async function DELETE(req: NextRequest) {
  try {
    const actor = await getActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requireStaff(actor);
    const { clinicId } = tenantWhere(actor);

    const { broadcastId } = await req.json();
    if (!broadcastId) return NextResponse.json({ error: "broadcastId required" }, { status: 400 });

    const owned = await (prisma as any).clinicBroadcast.findUnique({ where: { id: broadcastId }, select: { clinicId: true } });
    if (!owned || owned.clinicId !== clinicId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await (prisma as any).clinicMessage.deleteMany({ where: { broadcastId } });
    await (prisma as any).clinicBroadcast.delete({ where: { id: broadcastId } });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/broadcasts] DELETE error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
