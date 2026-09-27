/**
 * Avisar o paciente sobre scan, análise e palmilhas.
 *
 * ## Isto nunca funcionou, e o arquivo agora diz isso
 *
 * Reescrito em 27/09/2026, depois de o `tsc` acusar 8 erros aqui. Os erros não
 * eram de estilo — eram o retrato de um recurso que **falha desde sempre**:
 *
 * | | |
 * |---|---|
 * | `prisma.notification.create` | **não existe esse model.** O schema só tem `JourneyNotification`. A chamada lançava, e o `catch` original relançava |
 * | `sendEmail({ template, data })` | `sendEmail` pede `html`. Com `template`/`data` o corpo chegava `undefined` |
 *
 * E os quatro chamadores envolvem tudo em `try/catch` que só faz
 * `console.warn`. Então cada "avisamos o paciente" das rotas de foot scan e de
 * body assessment era uma linha de log num container que ninguém abre. O
 * paciente nunca foi avisado, e nenhuma tela dizia isso.
 *
 * ## Por que eu não simplesmente liguei
 *
 * Porque ligar significaria começar a mandar e-mail para paciente de verdade, e
 * há três regras do Bruno contra isso:
 *
 * 1. **Nada sai para paciente automaticamente** — só por botão manual, até
 *    existir painel de acompanhamento. Os crons de lembrete estão desligados
 *    desde 17/09/2026 por essa razão.
 * 2. **Nada sai sem a logo BPR e sem ele ver a prévia.** Estes textos não têm
 *    logo, nem prévia, nem etapa de validação.
 * 3. **Inglês é a língua primária, e as duas versões se revisam juntas.** Estes
 *    textos são só em português, com emoji no assunto.
 *
 * Um recurso que falha em silêncio é ruim. Um recurso que começa a escrever para
 * pacientes reais sem ninguém ter lido o texto é pior.
 *
 * ## O que este arquivo faz agora
 *
 * **Registra a intenção, e não finge.** Cada aviso que a clínica quis dar vira
 * uma linha em `SystemLog` com nível WARN e o texto pretendido. Nada é enviado,
 * nada lança, e o estado deixa de ser invisível: dá para abrir os logs e ver
 * exatamente quantos avisos deixaram de sair, para quem, e desde quando.
 *
 * ## Para ligar de verdade, na ordem
 *
 * 1. Decidir onde mora o aviso dentro do app — reaproveitar o push (que
 *    funciona, `lib/push-send.ts`) ou criar o model de notificação in-app.
 * 2. Escrever os textos em **inglês primeiro**, depois português, com a logo.
 * 3. Passar pela etapa de prévia, com o Bruno validando antes do primeiro envio.
 * 4. Só então trocar o `registrar` abaixo pelo envio.
 */

import { prisma } from '@/lib/db';
import { logSystem } from '@/lib/system-logger';

export type NotificationType =
  | 'SCAN_RECEIVED'
  | 'ANALYSIS_READY'
  | 'INSOLES_GENERATING'
  | 'APPROVED_FOR_PRODUCTION'
  | 'IN_PRODUCTION'
  | 'READY_FOR_PICKUP'
  | 'APPOINTMENT_REMINDER'
  | 'REVIEW_REQUESTED';

interface NotificationData {
  patientId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: any;
}

/**
 * O aviso que a clínica quis dar, registrado em vez de perdido.
 *
 * Devolve `null` de propósito: quem chama não recebe um objeto que dê a
 * impressão de que algo foi criado.
 */
export async function createPatientNotification(data: NotificationData): Promise<null> {
  await logSystem({
    level: 'WARN',
    category: 'API',
    message: `Aviso ao paciente não entregue (${data.type}): ${data.title}`,
    source: 'lib/notifications/patient-notifications',
    userId: data.patientId,
    details: {
      type: data.type,
      title: data.title,
      messageText: data.message,
      actionUrl: data.actionUrl ?? null,
      metadata: data.metadata ?? null,
      // O que falta, para quem ler o log não precisar ler o código.
      motivo: 'sem destino de aviso in-app, e envio automático a paciente está desligado',
    },
  }).catch((e) => console.error('[patient-notifications] log falhou:', e?.message));

  return null;
}

/** O paciente existe? Sem ele não há nem o que registrar. */
async function pacienteDe(patientId: string) {
  return prisma.user.findUnique({
    where: { id: patientId },
    select: { email: true, firstName: true },
  });
}

export async function notifyScanReceived(patientId: string, scanId: string, scanNumber: string) {
  const patient = await pacienteDe(patientId);
  if (!patient) return;

  await createPatientNotification({
    patientId,
    type: 'SCAN_RECEIVED',
    title: 'Scan received',
    message: 'Your images arrived and are being analysed.',
    actionUrl: '/dashboard',
    metadata: { scanId, scanNumber },
  });
}

export async function notifyAnalysisReady(patientId: string, scanId: string, scanNumber: string) {
  const patient = await pacienteDe(patientId);
  if (!patient) return;

  await createPatientNotification({
    patientId,
    type: 'ANALYSIS_READY',
    title: 'Your results are ready',
    message: 'Your biomechanical analysis is complete.',
    actionUrl: '/dashboard',
    metadata: { scanId, scanNumber },
  });
}

export async function notifyInProduction(
  patientId: string,
  scanId: string,
  scanNumber: string,
  estimatedDelivery?: Date
) {
  const patient = await pacienteDe(patientId);
  if (!patient) return;

  await createPatientNotification({
    patientId,
    type: 'IN_PRODUCTION',
    title: 'Your insoles are being made',
    message: 'Your insoles are in production.',
    actionUrl: '/dashboard',
    metadata: {
      scanId,
      scanNumber,
      // ISO, e não uma data formatada em pt-BR: isto é log, não texto de tela,
      // e a formatação pertence a quem for escrever o aviso de verdade.
      estimatedDelivery: estimatedDelivery?.toISOString() ?? null,
    },
  });
}

export async function notifyReadyForPickup(patientId: string, scanId: string, scanNumber: string) {
  const patient = await pacienteDe(patientId);
  if (!patient) return;

  await createPatientNotification({
    patientId,
    type: 'READY_FOR_PICKUP',
    title: 'Your insoles are ready',
    message: 'Your insoles are ready to collect at the clinic.',
    actionUrl: '/dashboard',
    metadata: { scanId, scanNumber },
  });
}

/**
 * As três abaixo liam e escreviam no model que não existe.
 *
 * Deixá-las chamando `prisma.notification` mantinha três erros de tipo e a
 * promessa de uma caixa de avisos que nunca houve. Enquanto não existir o
 * destino, a resposta honesta é a lista vazia — e não uma exceção.
 */
export async function markNotificationAsRead(notificationId: string, userId: string): Promise<null> {
  void notificationId;
  void userId;
  return null;
}

export async function markAllNotificationsAsRead(userId: string): Promise<{ count: number }> {
  void userId;
  return { count: 0 };
}

export async function getUnreadNotifications(userId: string): Promise<never[]> {
  void userId;
  return [];
}
