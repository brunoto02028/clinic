/**
 * Sistema de Notificações para Pacientes
 * Sincroniza ações da clínica com notificações para o paciente
 */

import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';

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
 * Cria notificação in-app para o paciente
 */
export async function createPatientNotification(data: NotificationData) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: data.patientId,
        type: data.type,
        title: data.title,
        message: data.message,
        actionUrl: data.actionUrl,
        metadata: data.metadata || {},
        read: false,
      },
    });

    console.log(`[Notification] Created for patient ${data.patientId}: ${data.type}`);
    return notification;
  } catch (error) {
    console.error('[Notification] Error creating notification:', error);
    throw error;
  }
}

/**
 * Notifica paciente sobre scan recebido
 */
export async function notifyScanReceived(patientId: string, scanId: string, scanNumber: string) {
  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    select: { email: true, firstName: true },
  });

  if (!patient) return;

  // Notificação in-app
  await createPatientNotification({
    patientId,
    type: 'SCAN_RECEIVED',
    title: '✅ Scan Recebido',
    message: 'Suas imagens foram recebidas com sucesso. Estamos analisando agora!',
    actionUrl: `/dashboard`,
    metadata: { scanId, scanNumber },
  });

  // E-mail
  await sendEmail({
    to: patient.email,
    subject: 'Scan Recebido - BPR Clinic',
    template: 'scan-received',
    data: {
      firstName: patient.firstName,
      scanNumber,
      scanUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    },
  });

  console.log(`[Notification] Scan received notification sent to ${patient.email}`);
}

/**
 * Notifica paciente sobre análise completa
 */
export async function notifyAnalysisReady(patientId: string, scanId: string, scanNumber: string) {
  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    select: { email: true, firstName: true, phone: true },
  });

  if (!patient) return;

  // Notificação in-app
  await createPatientNotification({
    patientId,
    type: 'ANALYSIS_READY',
    title: '🎉 Resultados Prontos!',
    message: 'Sua análise biomecânica está completa. Veja seus resultados agora!',
    actionUrl: `/dashboard`,
    metadata: { scanId, scanNumber },
  });

  // E-mail
  await sendEmail({
    to: patient.email,
    subject: 'Seus Resultados Estão Prontos! - BPR Clinic',
    template: 'analysis-ready',
    data: {
      firstName: patient.firstName,
      scanNumber,
      scanUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    },
  });

  console.log(`[Notification] Analysis ready notification sent to ${patient.email}`);
}

/**
 * Notifica paciente sobre palmilhas em produção
 */
export async function notifyInProduction(
  patientId: string,
  scanId: string,
  scanNumber: string,
  estimatedDelivery?: Date
) {
  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    select: { email: true, firstName: true },
  });

  if (!patient) return;

  const estimatedDate = estimatedDelivery
    ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(estimatedDelivery)
    : '5-7 dias';

  // Notificação in-app
  await createPatientNotification({
    patientId,
    type: 'IN_PRODUCTION',
    title: '🔄 Em Produção',
    message: `Suas palmilhas estão sendo fabricadas! Previsão: ${estimatedDate}`,
    actionUrl: `/dashboard`,
    metadata: { scanId, scanNumber, estimatedDelivery },
  });

  // E-mail
  await sendEmail({
    to: patient.email,
    subject: 'Suas Palmilhas Estão Sendo Fabricadas! - BPR Clinic',
    template: 'in-production',
    data: {
      firstName: patient.firstName,
      scanNumber,
      estimatedDate,
      scanUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    },
  });

  console.log(`[Notification] In production notification sent to ${patient.email}`);
}

/**
 * Notifica paciente que palmilhas estão prontas
 */
export async function notifyReadyForPickup(patientId: string, scanId: string, scanNumber: string) {
  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    select: { email: true, firstName: true, phone: true },
  });

  if (!patient) return;

  // Notificação in-app
  await createPatientNotification({
    patientId,
    type: 'READY_FOR_PICKUP',
    title: '🎉 Pronto para Retirar!',
    message: 'Suas palmilhas estão prontas! Você pode retirá-las na clínica.',
    actionUrl: `/dashboard`,
    metadata: { scanId, scanNumber },
  });

  // E-mail
  await sendEmail({
    to: patient.email,
    subject: 'Suas Palmilhas Estão Prontas! 🎉 - BPR Clinic',
    template: 'ready-for-pickup',
    data: {
      firstName: patient.firstName,
      scanNumber,
      clinicAddress: 'BPR Clinic - Ipswich',
      clinicHours: 'Segunda a Sexta: 9h - 18h',
      scanUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    },
  });

  // SMS (se tiver telefone)
  if (patient.phone) {
    // TODO: Implementar envio de SMS
    console.log(`[Notification] SMS would be sent to ${patient.phone}`);
  }

  console.log(`[Notification] Ready for pickup notification sent to ${patient.email}`);
}

/**
 * Marca notificação como lida
 */
export async function markNotificationAsRead(notificationId: string, userId: string) {
  try {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    console.log(`[Notification] Marked as read: ${notificationId}`);
  } catch (error) {
    console.error('[Notification] Error marking as read:', error);
  }
}

/**
 * Marca todas as notificações como lidas
 */
export async function markAllNotificationsAsRead(userId: string) {
  try {
    await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    console.log(`[Notification] Marked all as read for user ${userId}`);
  } catch (error) {
    console.error('[Notification] Error marking all as read:', error);
  }
}

/**
 * Busca notificações não lidas do usuário
 */
export async function getUnreadNotifications(userId: string) {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        read: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    return notifications;
  } catch (error) {
    console.error('[Notification] Error fetching unread notifications:', error);
    return [];
  }
}
