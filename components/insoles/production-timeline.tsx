"use client";

/**
 * Timeline de Produção de Palmilhas
 * Mostra o progresso visual da produção
 */

import { Check, Clock, Package, Truck, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TimelineStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'in_progress' | 'pending';
  date?: Date;
  estimatedDate?: Date;
  icon: React.ReactNode;
}

interface ProductionTimelineProps {
  workflowStatus: string;
  createdAt: Date;
  reviewedAt?: Date | null;
  approvedAt?: Date | null;
  manufacturingReadyAt?: Date | null;
  estimatedDelivery?: Date;
}

export function ProductionTimeline({
  workflowStatus,
  createdAt,
  reviewedAt,
  approvedAt,
  manufacturingReadyAt,
  estimatedDelivery,
}: ProductionTimelineProps) {
  
  // Mapear status do workflow para steps da timeline
  const getSteps = (): TimelineStep[] => {
    const steps: TimelineStep[] = [
      {
        id: 'scan',
        title: 'Scan Realizado',
        description: 'Suas imagens foram capturadas',
        status: 'completed',
        date: createdAt,
        icon: <CheckCircle2 className="h-5 w-5" />,
      },
      {
        id: 'analysis',
        title: 'Análise Completa',
        description: 'Análise biomecânica finalizada',
        status: reviewedAt ? 'completed' : workflowStatus === 'CLINICAL_REVIEW_PENDING' ? 'in_progress' : 'pending',
        date: reviewedAt || undefined,
        icon: <Check className="h-5 w-5" />,
      },
      {
        id: 'approved',
        title: 'Aprovado para Produção',
        description: 'Especificações aprovadas',
        status: approvedAt ? 'completed' : workflowStatus === 'APPROVED_FOR_PRODUCTION' ? 'in_progress' : 'pending',
        date: approvedAt || undefined,
        icon: <CheckCircle2 className="h-5 w-5" />,
      },
      {
        id: 'production',
        title: 'Em Produção',
        description: 'Suas palmilhas estão sendo fabricadas',
        status: manufacturingReadyAt ? 'completed' : workflowStatus === 'IN_PRODUCTION' ? 'in_progress' : 'pending',
        date: manufacturingReadyAt || undefined,
        icon: <Package className="h-5 w-5" />,
      },
      {
        id: 'ready',
        title: 'Pronto para Retirar',
        description: 'Suas palmilhas estão prontas!',
        status: workflowStatus === 'DELIVERED' ? 'completed' : workflowStatus === 'SHIPPED' ? 'in_progress' : 'pending',
        estimatedDate: estimatedDelivery,
        icon: <Truck className="h-5 w-5" />,
      },
    ];
    
    return steps;
  };
  
  const steps = getSteps();
  const currentStepIndex = steps.findIndex(s => s.status === 'in_progress');
  const progress = ((steps.filter(s => s.status === 'completed').length) / steps.length) * 100;
  
  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-gray-700">Progresso</span>
          <span className="text-teal-600 font-semibold">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-teal-600 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      {/* Timeline */}
      <div className="relative space-y-6">
        {/* Linha vertical */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
        
        {steps.map((step, index) => {
          const isCompleted = step.status === 'completed';
          const isInProgress = step.status === 'in_progress';
          const isPending = step.status === 'pending';
          
          return (
            <div key={step.id} className="relative flex gap-4">
              {/* Ícone */}
              <div
                className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                  isCompleted
                    ? 'bg-teal-600 border-teal-600 text-white'
                    : isInProgress
                    ? 'bg-white border-teal-600 text-teal-600 animate-pulse'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <Check className="h-6 w-6" />
                ) : isInProgress ? (
                  <Clock className="h-6 w-6" />
                ) : (
                  step.icon
                )}
              </div>
              
              {/* Conteúdo */}
              <div className="flex-1 pb-6">
                <div className={`rounded-lg border p-4 transition-all ${
                  isCompleted
                    ? 'bg-teal-50 border-teal-200'
                    : isInProgress
                    ? 'bg-white border-teal-300 shadow-md'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className={`font-semibold ${
                        isCompleted || isInProgress ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </h4>
                      <p className={`text-sm mt-1 ${
                        isCompleted || isInProgress ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                        {step.description}
                      </p>
                    </div>
                    
                    {/* Data */}
                    {step.date && (
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {format(step.date, "dd MMM, HH:mm", { locale: ptBR })}
                      </span>
                    )}
                    {!step.date && step.estimatedDate && (
                      <span className="text-xs text-teal-600 whitespace-nowrap font-medium">
                        Previsão: {format(step.estimatedDate, "dd MMM", { locale: ptBR })}
                      </span>
                    )}
                  </div>
                  
                  {/* Status badge */}
                  {isInProgress && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-medium">
                      <div className="w-2 h-2 bg-teal-600 rounded-full animate-pulse" />
                      Em andamento
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Notificação */}
      {workflowStatus === 'IN_PRODUCTION' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              📱
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                Você receberá uma notificação
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Assim que suas palmilhas estiverem prontas, enviaremos um SMS e e-mail para você.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {workflowStatus === 'DELIVERED' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              🎉
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">
                Suas palmilhas estão prontas!
              </p>
              <p className="text-sm text-green-700 mt-1">
                Você pode retirá-las na clínica durante o horário de funcionamento.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
