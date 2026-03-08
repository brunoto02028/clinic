"use client";

import { useEffect } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DashboardError]", error);
  }, [error]);

  const isChunkError =
    error?.message?.includes("ChunkLoadError") ||
    error?.message?.includes("Loading chunk") ||
    error?.message?.includes("Failed to fetch dynamically imported module") ||
    error?.message?.includes("Unexpected token");

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7 text-amber-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground mb-2">
            {isChunkError ? "New version available" : "Something went wrong"}
          </h2>
          <p className="text-muted-foreground text-sm">
            {isChunkError
              ? "The app has been updated. Please refresh to continue."
              : "An unexpected error occurred. Your data is safe."}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Page
          </button>
          <button
            onClick={reset}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
