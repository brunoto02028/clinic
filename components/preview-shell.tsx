"use client";

import { useSearchParams } from "next/navigation";
import { PreviewProvider } from "@/lib/preview-context";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import { ReactNode } from "react";

export function PreviewShell({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const patientId = searchParams?.get("pid") || null;
  const patientName = searchParams?.get("pname") || null;

  return (
    <PreviewProvider patientId={patientId} patientName={patientName}>
      <DashboardLayout forcePatientMode previewPatientId={patientId}>
        {children}
      </DashboardLayout>
    </PreviewProvider>
  );
}
