/**
 * Sistema de Eventos para Foot Scans
 * Rastreia todas as ações e mantém histórico completo
 */

import { prisma } from '@/lib/db';

export type FootScanEventType =
  | 'SCAN_CREATED'
  | 'SCAN_UPLOADED'
  | 'ANALYSIS_STARTED'
  | 'ANALYSIS_COMPLETED'
  | 'INSOLES_GENERATED'
  | 'REVIEW_SUBMITTED'
  | 'APPROVED_FOR_PRODUCTION'
  | 'PRODUCTION_STARTED'
  | 'PRODUCTION_COMPLETED'
  | 'READY_FOR_PICKUP'
  | 'DELIVERED'
  | 'PATIENT_VIEWED'
  | 'PATIENT_DOWNLOADED';

export type ActorType = 'PATIENT' | 'THERAPIST' | 'ADMIN' | 'SYSTEM';

interface CreateEventData {
  footScanId: string;
  eventType: FootScanEventType;
  actorType: ActorType;
  actorId: string;
  description?: string;
  metadata?: any;
}

/**
 * Cria um evento no histórico do foot scan
 */
export async function createFootScanEvent(data: CreateEventData) {
  try {
    const event = await (prisma as any).footScanEvent.create({
      data: {
        footScanId: data.footScanId,
        eventType: data.eventType,
        actorType: data.actorType,
        actorId: data.actorId,
        description: data.description,
        payload: data.metadata || {},
        timestamp: new Date(),
      },
    });

    console.log(`[Event] Created: ${data.eventType} for scan ${data.footScanId}`);
    return event;
  } catch (error) {
    console.error('[Event] Error creating event:', error);
    // Não lançar erro - eventos são secundários
    return null;
  }
}

/**
 * Registra que análise foi iniciada
 */
export async function logAnalysisStarted(footScanId: string, therapistId: string) {
  return createFootScanEvent({
    footScanId,
    eventType: 'ANALYSIS_STARTED',
    actorType: 'THERAPIST',
    actorId: therapistId,
    description: 'Análise biomecânica iniciada',
  });
}

/**
 * Registra que análise foi completada
 */
export async function logAnalysisCompleted(
  footScanId: string,
  therapistId: string,
  results: any
) {
  return createFootScanEvent({
    footScanId,
    eventType: 'ANALYSIS_COMPLETED',
    actorType: 'THERAPIST',
    actorId: therapistId,
    description: 'Análise biomecânica completada',
    metadata: {
      archType: results.archType,
      pronation: results.pronation,
      calcanealAlignment: results.calcanealAlignment,
    },
  });
}

/**
 * Registra que palmilhas foram geradas
 */
export async function logInsolesGenerated(
  footScanId: string,
  therapistId: string,
  insoleUrls: { left: string; right: string }
) {
  return createFootScanEvent({
    footScanId,
    eventType: 'INSOLES_GENERATED',
    actorType: 'THERAPIST',
    actorId: therapistId,
    description: 'Palmilhas 3D geradas',
    metadata: {
      leftInsoleUrl: insoleUrls.left,
      rightInsoleUrl: insoleUrls.right,
    },
  });
}

/**
 * Registra que foi aprovado para produção
 */
export async function logApprovedForProduction(footScanId: string, therapistId: string) {
  return createFootScanEvent({
    footScanId,
    eventType: 'APPROVED_FOR_PRODUCTION',
    actorType: 'THERAPIST',
    actorId: therapistId,
    description: 'Aprovado para produção',
  });
}

/**
 * Registra que produção foi iniciada
 */
export async function logProductionStarted(footScanId: string, therapistId: string) {
  return createFootScanEvent({
    footScanId,
    eventType: 'PRODUCTION_STARTED',
    actorType: 'THERAPIST',
    actorId: therapistId,
    description: 'Produção iniciada',
  });
}

/**
 * Registra que está pronto para retirar
 */
export async function logReadyForPickup(footScanId: string, therapistId: string) {
  return createFootScanEvent({
    footScanId,
    eventType: 'READY_FOR_PICKUP',
    actorType: 'THERAPIST',
    actorId: therapistId,
    description: 'Pronto para retirar',
  });
}

/**
 * Registra que paciente visualizou
 */
export async function logPatientViewed(footScanId: string, patientId: string, viewType: string) {
  return createFootScanEvent({
    footScanId,
    eventType: 'PATIENT_VIEWED',
    actorType: 'PATIENT',
    actorId: patientId,
    description: `Paciente visualizou ${viewType}`,
    metadata: { viewType },
  });
}

/**
 * Registra que paciente baixou relatório
 */
export async function logPatientDownloaded(footScanId: string, patientId: string, fileType: string) {
  return createFootScanEvent({
    footScanId,
    eventType: 'PATIENT_DOWNLOADED',
    actorType: 'PATIENT',
    actorId: patientId,
    description: `Paciente baixou ${fileType}`,
    metadata: { fileType },
  });
}

/**
 * Busca histórico de eventos de um foot scan
 */
export async function getFootScanEvents(footScanId: string) {
  try {
    const events = await (prisma as any).footScanEvent.findMany({
      where: { footScanId },
      orderBy: { timestamp: 'desc' },
      include: {
        actor: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    return events;
  } catch (error) {
    console.error('[Event] Error fetching events:', error);
    return [];
  }
}

/**
 * Busca eventos recentes de um paciente
 */
export async function getPatientRecentEvents(patientId: string, limit: number = 10) {
  try {
    const events = await (prisma as any).footScanEvent.findMany({
      where: {
        footScan: {
          patientId,
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        footScan: {
          select: {
            scanNumber: true,
          },
        },
      },
    });

    return events;
  } catch (error) {
    console.error('[Event] Error fetching patient events:', error);
    return [];
  }
}
