"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function PatientSubpageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Patient subpage error:", error);
  }, [error]);

  return (
    <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-4">
      <h2 className="text-xl font-bold text-destructive">Something went wrong</h2>
      <pre className="text-left text-xs bg-muted p-4 rounded-lg overflow-auto max-h-60 whitespace-pre-wrap break-words">
        {error.message}
        {"\n\n"}
        {error.stack}
      </pre>
      {error.digest && (
        <p className="text-xs text-muted-foreground">Digest: {error.digest}</p>
      )}
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
