"use client";

import { useState } from "react";
import { Eye, ArrowLeft } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

// A SUPERADMIN managing another tenant sees that tenant's panel (activity 57)
// — this strip says so and takes them back to their own in one click.
export default function TenantViewBanner({ tenantName }: { tenantName: string }) {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const [leaving, setLeaving] = useState(false);

  const back = async () => {
    setLeaving(true);
    try {
      await fetch("/api/admin/switch-clinic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId: null }),
      });
    } finally {
      window.location.href = "/admin";
    }
  };

  return (
    <div className="mx-4 mt-3 lg:mx-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <Eye className="h-4 w-4 shrink-0" />
      <span className="min-w-[14rem] flex-1">
        {isPt ? "Você está vendo " : "Viewing "}
        <strong>{tenantName}</strong>
        {isPt ? " como admin da plataforma" : " as platform admin"}
      </span>
      <button
        onClick={back}
        disabled={leaving}
        className="inline-flex items-center gap-1 rounded-md bg-amber-900/10 px-2.5 py-1 text-xs font-medium hover:bg-amber-900/20 disabled:opacity-50"
      >
        <ArrowLeft className="h-3 w-3" />
        {isPt ? "Voltar para a BPR" : "Back to BPR"}
      </button>
    </div>
  );
}
