"use client";

import { useState, useEffect, ReactNode } from "react";
import { PullToRefresh } from "@/components/dashboard/pull-to-refresh";
import { useSession } from "next-auth/react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Activity, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import ModuleGate from "@/components/dashboard/module-gate";
import MobilePageHeader from "@/components/dashboard/mobile-page-header";
import PatientSidebar from "@/components/dashboard/patient-sidebar";

interface DashboardLayoutProps {
  children: ReactNode;
  forcePatientMode?: boolean;
  previewPatientId?: string | null;
}

export default function DashboardLayout({ children, forcePatientMode = false, previewPatientId }: DashboardLayoutProps) {
  const { data: session, status } = useSession() || {};
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isPatientPreview = forcePatientMode || searchParams?.get("preview") === "patient";
  const [mounted, setMounted] = useState(false);
  const { locale, setLocale } = useLocale();
  const T = (key: string) => i18nT(key, locale);

  // Impersonation detection
  const [isImpersonating, setIsImpersonating] = useState(false);

  const [consentRequired, setConsentRequired] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    setMounted(true);
    // Detect impersonation cookie
    const cookieMatch = document.cookie.match(/(^| )impersonate-patient-name=([^;]+)/);
    if (cookieMatch) {
      setIsImpersonating(true);
    }
    // Check consent status for patients (not preview, not admin/therapist)
    const role = (session?.user as any)?.role || "PATIENT";
    if (!forcePatientMode && role === "PATIENT") {
      fetch("/api/patient/consent")
        .then(res => res.json())
        .then(data => {
          if (!data.consentAcceptedAt) setConsentRequired(true);
        })
        .catch(() => {});
    }
    // Sync locale from patient's DB preference on first load
    if (role === "PATIENT" && !forcePatientMode) {
      fetch("/api/patient/profile")
        .then(res => res.json())
        .then(data => {
          const dbLocale = data?.user?.preferredLocale;
          if (dbLocale && (dbLocale === "pt-BR" || dbLocale === "en-GB")) {
            const current = localStorage.getItem("clinic-locale");
            if (!current || current !== dbLocale) {
              setLocale(dbLocale);
            }
          }
        })
        .catch(() => {});
    }
    // Fetch patient notification count
    fetch("/api/patient/notifications")
      .then(res => res.json())
      .then(data => {
        if (data.unreadCount !== undefined) setNotifCount(data.unreadCount);
      })
      .catch(() => {});
  }, []);

  const userRole = (session?.user as any)?.role || "PATIENT";
  const isTherapist = !isPatientPreview && !isImpersonating && (userRole === "ADMIN" || userRole === "SUPERADMIN" || userRole === "THERAPIST");

  if (!mounted || status === "loading") {
    return (
      <div className="public-site min-h-screen bg-background bg-grid-pattern flex items-center justify-center">
        <div className="animate-pulse-soft rounded-full p-4">
          <Activity className="h-12 w-12 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="public-site min-h-screen bg-background bg-grid-pattern">
      {/* Sidebar */}
      <PatientSidebar notifications={notifCount} />

      {/* Main content */}
      <div className="patient-content-area">
        {/* Page content */}
        <main className="p-4 lg:p-8">
          <PullToRefresh disabled={pathname === "/dashboard/screening" || pathname === "/dashboard/profile"}>
          <MobilePageHeader />
          {/* Consent gate: block everything except the consent page itself — skip during impersonation so admin can navigate */}
          {consentRequired && pathname !== "/dashboard/consent" && !isTherapist && !isPatientPreview && !isImpersonating ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
              <Scale className="h-12 w-12 text-primary" />
              <h2 className="text-xl font-bold">{T("consent.gateTitle")}</h2>
              <p className="text-muted-foreground max-w-md">
                {T("consent.gateDesc")}
              </p>
              <Button asChild size="lg" className="gap-2">
                <Link href="/dashboard/consent">
                  <Scale className="h-4 w-4" />
                  {T("consent.gateBtn")}
                </Link>
              </Button>
            </div>
          ) : isTherapist || isPatientPreview ? (
            <div>{children}</div>
          ) : isImpersonating ? (
            <div>{children}</div>
          ) : (
            <ModuleGate>{children}</ModuleGate>
          )}
          </PullToRefresh>
        </main>
      </div>

    </div>
  );
}
