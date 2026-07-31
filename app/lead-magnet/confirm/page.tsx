"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/hooks/use-locale";

function ConfirmContent() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const { locale } = useLocale();
  const isPt = locale.startsWith("pt");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    fetch("/api/lead-magnet/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => (r.ok ? setStatus("done") : setStatus("error")))
      .catch(() => setStatus("error"));
  }, [token]);

  const copy = {
    done: {
      icon: "✅",
      title: isPt ? "E-mail confirmado!" : "Email confirmed!",
      body: isPt
        ? "Enviamos o seu guia por e-mail — confira sua caixa de entrada (e o spam, por garantia)."
        : "We've sent your guide by email — check your inbox (and spam folder, just in case).",
    },
    error: {
      icon: "❌",
      title: isPt ? "Link inválido ou expirado" : "Invalid or expired link",
      body: isPt
        ? "Não foi possível confirmar seu e-mail. Tente solicitar o guia novamente no artigo."
        : "We couldn't confirm your email. Please try requesting the guide again from the article.",
    },
    loading: {
      icon: "📧",
      title: isPt ? "Confirmando..." : "Confirming...",
      body: isPt ? "Por favor, aguarde." : "Please wait.",
    },
    idle: {
      icon: "📧",
      title: isPt ? "Confirmando..." : "Confirming...",
      body: isPt ? "Por favor, aguarde." : "Please wait.",
    },
  }[status];

  return (
    <div style={{ minHeight: "100vh", background: "#F5F4F1", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "48px 40px", maxWidth: 480, textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{copy.icon}</div>
        <h1 style={{ color: "#20242D", fontSize: 22, fontWeight: 700, margin: "0 0 12px" }}>{copy.title}</h1>
        <p style={{ color: "#6b7280", fontSize: 15, lineHeight: 1.6 }}>{copy.body}</p>
        <Link href="/articles" style={{ display: "inline-block", marginTop: 24, background: "#4F7361", color: "#fff", padding: "12px 28px", borderRadius: 8, textDecoration: "none", fontWeight: 600 }}>
          {isPt ? "Ver mais artigos" : "Browse more articles"}
        </Link>
      </div>
    </div>
  );
}

export default function LeadMagnetConfirmPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#F5F4F1" }} />}>
      <ConfirmContent />
    </Suspense>
  );
}
