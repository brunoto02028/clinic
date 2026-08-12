"use client";

import { useEffect } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";

  useEffect(() => {
    console.error("[DashboardError]", error);
  }, [error]);

  const isChunkError =
    error?.message?.includes("ChunkLoadError") ||
    error?.message?.includes("Loading chunk") ||
    error?.message?.includes("Failed to fetch dynamically imported module") ||
    error?.message?.includes("Unexpected token") ||
    error?.message?.includes("Loading CSS chunk") ||
    error?.message?.includes("prerender-manifest") ||
    error?.digest?.includes("NEXT");

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7 text-amber-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground mb-2">
            {isChunkError
              ? (isPt ? "Nova versão disponível" : "New version available")
              : (isPt ? "Algo deu errado" : "Something went wrong")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {isChunkError
              ? (isPt ? "O aplicativo foi atualizado. Atualize a página para continuar." : "The app has been updated. Please refresh to continue.")
              : (isPt ? "Ocorreu um erro inesperado. Seus dados estão seguros." : "An unexpected error occurred. Your data is safe.")}
          </p>
          {!isChunkError && error?.message && (
            <p className="text-xs text-red-400 mt-2 font-mono bg-red-500/10 p-2 rounded">
              {error.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            {isPt ? "Atualizar Página" : "Refresh Page"}
          </button>
          <button
            onClick={reset}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isPt ? "Tentar novamente" : "Try again"}
          </button>
        </div>
      </div>
    </div>
  );
}
