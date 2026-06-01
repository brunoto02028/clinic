"use client";

/**
 * Error State Component
 * Componente de erro consistente e amigável
 */

import { AlertCircle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error | string;
  onRetry?: () => void;
  showHomeButton?: boolean;
  showBackButton?: boolean;
  fullScreen?: boolean;
}

export function ErrorState({
  title = 'Algo deu errado',
  message = 'Ocorreu um erro inesperado. Por favor, tente novamente.',
  error,
  onRetry,
  showHomeButton = false,
  showBackButton = false,
  fullScreen = false,
}: ErrorStateProps) {
  const router = useRouter();

  const content = (
    <div className="flex flex-col items-center justify-center text-center p-8">
      <div className="rounded-full bg-red-100 p-4 mb-4">
        <AlertCircle className="h-12 w-12 text-red-600" />
      </div>
      
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md">{message}</p>
      
      {error && process.env.NODE_ENV === 'development' && (
        <div className="mb-6 p-4 bg-gray-100 rounded-lg text-left w-full max-w-md">
          <p className="text-xs font-mono text-gray-700 break-all">
            {typeof error === 'string' ? error : error.message}
          </p>
        </div>
      )}
      
      <div className="flex gap-3">
        {onRetry && (
          <Button onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Tentar Novamente
          </Button>
        )}
        
        {showBackButton && (
          <Button variant="outline" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        )}
        
        {showHomeButton && (
          <Button variant="outline" onClick={() => router.push('/dashboard')} className="gap-2">
            <Home className="h-4 w-4" />
            Ir para Início
          </Button>
        )}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        {content}
      </div>
    );
  }

  return content;
}

// Error específico para 404
export function NotFoundError({ resourceName = 'página' }: { resourceName?: string }) {
  return (
    <ErrorState
      title="Não Encontrado"
      message={`A ${resourceName} que você está procurando não foi encontrada.`}
      showHomeButton
      showBackButton
      fullScreen
    />
  );
}

// Error específico para permissão negada
export function PermissionDeniedError() {
  return (
    <ErrorState
      title="Acesso Negado"
      message="Você não tem permissão para acessar este recurso."
      showHomeButton
      fullScreen
    />
  );
}

// Error específico para network
export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Erro de Conexão"
      message="Não foi possível conectar ao servidor. Verifique sua conexão com a internet."
      onRetry={onRetry}
      showHomeButton
    />
  );
}
