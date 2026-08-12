"use client";

import { useState } from "react";
import { Eye, ArrowLeft } from "lucide-react";

/**
 * Presentational only. Whether impersonation is genuinely active is decided
 * server-side in the dashboard layout — reading the client-readable name
 * cookie here used to show this banner to real patients whose stale cookie
 * had outlived their admin's session.
 */
export default function ImpersonationBanner({ patientName }: { patientName: string }) {
  const [exiting, setExiting] = useState(false);

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
