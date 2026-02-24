"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function UnsubscribeContent() {
  const params = useSearchParams();
  const email = params.get("email") || "";
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  useEffect(() => {
    if (!email) return;
    setStatus("loading");
    fetch("/api/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
      .then((r) => (r.ok ? setStatus("done") : setStatus("error")))
      .catch(() => setStatus("error"));
  }, [email]);

  return (
    <div style={{ minHeight: "100vh", background: "#f4f7fa", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Segoe UI, sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "48px 40px", maxWidth: 480, textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>
          {status === "done" ? "✅" : status === "error" ? "❌" : "📧"}
        </div>
        <h1 style={{ color: "#607d7d", fontSize: 22, fontWeight: 700, margin: "0 0 12px" }}>
          {status === "done" ? "Unsubscribed" : status === "error" ? "Something went wrong" : "Processing..."}
        </h1>
        <p style={{ color: "#6b7280", fontSize: 15, lineHeight: 1.6 }}>
          {status === "done"
            ? `${email} has been removed from our mailing list. You will no longer receive marketing emails from us.`
            : status === "error"
            ? "We could not process your request. Please contact support@bpr.rehab."
            : "Please wait..."}
        </p>
        {status === "done" && (
          <a href="/" style={{ display: "inline-block", marginTop: 24, background: "#5dc9c0", color: "#fff", padding: "12px 28px", borderRadius: 8, textDecoration: "none", fontWeight: 600 }}>
            Back to Website
          </a>
        )}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#f4f7fa", display: "flex", alignItems: "center", justifyContent: "center" }}>Processing...</div>}>
      <UnsubscribeContent />
    </Suspense>
  );
}
