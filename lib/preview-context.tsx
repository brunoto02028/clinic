"use client";

import { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { useSearchParams } from "next/navigation";

interface PreviewContextValue {
  isPreview: boolean;
  patientId: string | null;
  patientName: string | null;
}

const PreviewContext = createContext<PreviewContextValue>({
  isPreview: false,
  patientId: null,
  patientName: null,
});

export function usePreview() {
  return useContext(PreviewContext);
}

/**
 * Wraps children in a preview context.
 * When patientId is set, all fetch() calls to /api/* are automatically
 * intercepted and have ?_pid=<patientId> appended so that API routes
 * can return that patient's data instead of the logged-in admin's.
 */
export function PreviewProvider({
  children,
  patientId,
  patientName,
}: {
  children: ReactNode;
  patientId: string | null;
  patientName: string | null;
}) {
  const originalFetchRef = useRef<typeof window.fetch | null>(null);

  useEffect(() => {
    if (!patientId) return;

    // Store the original fetch only once
    if (!originalFetchRef.current) {
      originalFetchRef.current = window.fetch.bind(window);
    }
    const originalFetch = originalFetchRef.current;

    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      let url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : (input as Request).url;

      // Only intercept relative API calls
      if (url.startsWith("/api/")) {
        const separator = url.includes("?") ? "&" : "?";
        url = `${url}${separator}_pid=${patientId}`;
        // Always pass modified URL as string so the _pid param is used
        return originalFetch(url, init);
      }

      return originalFetch(input, init);
    };

    return () => {
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
      }
    };
  }, [patientId]);

  return (
    <PreviewContext.Provider value={{ isPreview: !!patientId, patientId, patientName }}>
      {children}
    </PreviewContext.Provider>
  );
}
