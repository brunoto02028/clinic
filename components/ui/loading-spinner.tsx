"use client";

/**
 * Loading Spinner Reutilizável
 * Componente de loading consistente em todo o sistema
 */

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

export function LoadingSpinner({
  size = 'md',
  text,
  fullScreen = false,
  className,
}: LoadingSpinnerProps) {
  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <Loader2 className={cn('animate-spin text-teal-600', sizeClasses[size])} />
      {text && (
        <p className="text-sm text-gray-600 animate-pulse">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
}

// Loading state para páginas
export function PageLoading({ text = 'Carregando...' }: { text?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

// Loading state para cards
export function CardLoading() {
  return (
    <div className="p-8">
      <LoadingSpinner size="md" text="Carregando dados..." />
    </div>
  );
}

// Loading state para botões
export function ButtonLoading({ text = 'Processando...' }: { text?: string }) {
  return (
    <span className="flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      {text}
    </span>
  );
}

// Skeleton loader para listas
export function SkeletonLoader({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-20 bg-gray-200 rounded-lg"></div>
        </div>
      ))}
    </div>
  );
}
