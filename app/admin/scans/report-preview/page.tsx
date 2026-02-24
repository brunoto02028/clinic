"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import ScanReport from "@/components/scans/scan-report";

export default function ReportPreviewPage() {
  const searchParams = useSearchParams();
  const scanId = searchParams?.get("id") || "";
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!scanId) { setError("No scan ID provided"); setLoading(false); return; }
    fetch(`/api/foot-scans/${scanId}/report`)
      .then((r) => { if (!r.ok) throw new Error("Failed to load report"); return r.json(); })
      .then((data) => setReport(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [scanId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-red-500">{error}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 py-8">
      <ScanReport report={report} />
    </div>
  );
}
