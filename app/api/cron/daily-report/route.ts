import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicDailyAdherence } from "@/lib/clinic-daily-adherence";
import { getClinicWaiting, waitingEmailBlock } from "@/lib/clinic-waiting";
import { buildDailyAdherenceEmail, REPORT_ACTION } from "@/lib/daily-adherence-email";
import { sendEmail } from "@/lib/email";
import { logAudit } from "@/lib/system-logger";
import { getAdminNotificationEmail } from "@/lib/admin-notify-email";

export const dynamic = "force-dynamic";

/**
 * Para onde o relatório vai — **por tenant**, nunca um endereço fixo.
 *
 * Era `const REPORT_TO = "admin@bpr.clinic"`, e o laço abaixo percorre todas as
 * clínicas ativas: o relatório do estúdio do Emanuel, com o nome dos alunos
 * dele no corpo, caía na caixa da BPR. São produtos diferentes dentro do mesmo
 * sistema, e um não lê a caixa do outro.
 *
 * `getAdminNotificationEmail` já resolve isso e recusa, por desenho, devolver o
 * endereço do tenant padrão para um tenant que não seja ele.
 */

// Ação própria para a falha, e de propósito diferente de REPORT_ACTION: o
// dedupe procura REPORT_ACTION, então um dia que falhou continua elegível na
// próxima rodada.
const REPORT_FAILED_ACTION = "DAILY_ADHERENCE_REPORT_FAILED";

// POST /api/cron/daily-report — once a day (intended: 21h clinic time, see
// specs/049-relatorio-adesao-diaria): e-mails the clinic a completed/missing
// summary. Split out from /api/cron/daily-adherence (17/09/2026) so this can
// stay on an automatic schedule while patient-facing reminders stay
// manual-only — this route never touches a patient, only the clinic's own inbox.
// Call via cron: curl -X POST https://bpr.clinic/api/cron/daily-report?key=SECRET
export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  if (key !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Manual override for a missed run or testing a template change without
  // waiting for tomorrow — re-sends the report even if already sent today.
  const force = req.nextUrl.searchParams.get("force") === "true";

  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  // Só clínicas. Este é o relatório de adesão clínica — um estúdio de personal
  // é outro produto, com outra rotina, e nada dele passa por aqui.
  const clinics = await prisma.clinic.findMany({
    where: { isActive: true, type: "CLINIC" },
    select: { id: true, name: true },
  });

  const results: { clinicId: string; completed: number; missing: number; waiting: number; reportSent: boolean }[] = [];

  for (const clinic of clinics) {
    const { completed, missing } = await getClinicDailyAdherence(clinic.id, now);
    const waiting = await getClinicWaiting(clinic.id);

    // Antes bastava não haver exercício agendado para o dia passar em silêncio
    // — e um vídeo do paciente podia ficar esperando sem ninguém ser avisado.
    // Agora o silêncio exige as duas coisas: nada agendado **e** nada parado.
    if (completed.length === 0 && missing.length === 0 && waiting.total === 0) continue;

    const reportAlreadySent = !force && await prisma.auditLog.findFirst({
      where: { entityId: clinic.id, action: REPORT_ACTION, createdAt: { gte: dayStart } },
      select: { id: true },
    });
    let reportSent = false;
    if (!reportAlreadySent) {
      const baseUrl = process.env.NEXTAUTH_URL || "https://bpr.clinic";
      const html = await buildDailyAdherenceEmail(
        clinic.name, clinic.id, completed, missing, now,
        waitingEmailBlock(waiting, baseUrl)
      );
      // O assunto diz o que espera ação, porque é o que decide se o e-mail é
      // aberto hoje ou amanhã.
      const subject = waiting.total > 0
        ? `${clinic.name}: ${waiting.total} waiting for you · ${completed.length} completed, ${missing.length} missing`
        : `${clinic.name}: ${completed.length} completed, ${missing.length} missing today`;
      // `sendEmail` não estoura quando o provedor recusa — devolve
      // `success:false`. Registrar isso como "e-mailed" era pior que perder o
      // e-mail: o dedupe acima lê exatamente essa linha, então o dia perdido
      // nunca seria retentado e nada diria que faltou.
      const destino = await getAdminNotificationEmail(clinic.id);
      const enviado = await sendEmail({ to: destino, subject, html });
      await logAudit({
        userId: "system",
        userEmail: "",
        userRole: "SYSTEM",
        action: enviado?.success ? REPORT_ACTION : REPORT_FAILED_ACTION,
        entity: "Clinic",
        entityId: clinic.id,
        description: enviado?.success
          ? `Daily adherence report e-mailed for ${clinic.name}`
          : `Daily adherence report FAILED to send for ${clinic.name}`,
        metadata: {
          waiting: waiting.total,
          exerciseVideos: waiting.exerciseVideos,
          ...(enviado?.success ? {} : { error: (enviado as any)?.error ?? "unknown" }),
        },
      });
      reportSent = !!enviado?.success;
    }

    results.push({
      clinicId: clinic.id,
      completed: completed.length,
      missing: missing.length,
      waiting: waiting.total,
      reportSent,
    });
  }

  return NextResponse.json({ results });
}
