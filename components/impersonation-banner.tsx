"use client";

import { useState, useEffect } from "react";
import { Eye, X, ArrowLeft } from "lucide-react";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

export default function ImpersonationBanner() {
  const [patientName, setPatientName] = useState<string | null>(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const name = getCookie("impersonate-patient-name");
    setPatientName(name);
  }, []);

  if (!patientName) return null;

  const handleExit = async () => {
    setExiting(true);
    try {
      await fetch("/api/admin/impersonate", { method: "DELETE" });
      // Clear the cookie on the client side too
      document.cookie = "impersonate-patient-name=; path=/; max-age=0";
      document.cookie = "impersonate-patient-id=; path=/; max-age=0";
      document.cookie = "impersonate-admin-id=; path=/; max-age=0";
      window.location.href = "/admin";
    } catch {
      setExiting(false);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-blue-600 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm shadow-lg">
      <Eye className="h-4 w-4 shrink-0" />
      <span className="font-medium">
        Visualizando como: <strong>{patientName}</strong>
      </span>
      <span className="text-blue-200 text-xs hidden sm:inline">— Você está vendo exatamente o que o paciente vê</span>
      <button
        onClick={handleExit}
        disabled={exiting}
        className="ml-4 flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
      >
        <ArrowLeft className="h-3 w-3" />
        {exiting ? "Saindo..." : "Voltar ao Admin"}
      </button>
    </div>
  );
}
