"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Report error to server for debugging
  if (typeof window !== "undefined") {
    try {
      fetch("/api/client-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: error?.message || "Unknown error",
          stack: error?.stack || "",
          digest: error?.digest || "",
          url: window.location.href,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {});
    } catch {}
  }

  return (
    <html>
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0a0f1e", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "24px" }}>
        <div style={{ maxWidth: 500, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, marginBottom: 16 }}>Something went wrong</h1>
          <div style={{ background: "#1a1f2e", border: "1px solid #333", borderRadius: 8, padding: 16, marginBottom: 16, textAlign: "left", fontSize: 13, wordBreak: "break-all", maxHeight: 200, overflow: "auto" }}>
            <strong>Error:</strong> {error?.message || "Unknown"}<br />
            <strong>Digest:</strong> {error?.digest || "none"}<br />
            <strong>URL:</strong> {typeof window !== "undefined" ? window.location.href : ""}
          </div>
          <button onClick={() => window.location.reload()} style={{ background: "#5dc9c0", color: "#000", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 14, cursor: "pointer", fontWeight: 600 }}>
            Refresh Page
          </button>
          <br />
          <button onClick={reset} style={{ background: "transparent", color: "#999", border: "1px solid #444", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", marginTop: 8 }}>
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
