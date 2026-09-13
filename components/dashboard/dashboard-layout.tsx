"use client";

import { useState, useEffect, ReactNode } from "react";
import { PullToRefresh } from "@/components/dashboard/pull-to-refresh";
import { useSession } from "next-auth/react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Activity, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/use-locale";
import { useVocab } from "@/hooks/use-vocab";
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
  const { relabel } = useVocab();
  const T = (key: string) => relabel(i18nT(key, locale));

  // Impersonation detection
  const [isImpersonating, setIsImpersonating] = useState(false);

  const [consentRequired, setConsentRequired] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifItems, setNotifItems] = useState<any[]>([]);
  // Mirrors PatientSidebar's own localStorage read so .patient-content-area
  // can widen to match a pinned-open rail instead of the menu overlaying it.
  const [sidebarPinned, setSidebarPinned] = useState(false);
  useEffect(() => {
    if (localStorage.getItem("patient-sidebar-pinned") === "true") setSidebarPinned(true);
  }, []);

  // Radix UI portals (Dialog, AlertDialog, DropdownMenu, Select, Toast...) render
  // into document.body, outside the .public-site-scoped wrapper div below — so
  // without this, their CSS variables fall back to the dark admin theme. Toggling
  // the class on body itself keeps portaled content in the light patient-portal theme.
  useEffect(() => {
    document.body.classList.add("public-site");
    return () => document.body.classList.remove("public-site");
  }, []);

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
    // Seed locale from the patient's DB preference the first time this browser
    // has no saved choice yet (e.g. a new device). Once a local choice exists,
    // it wins — otherwise a stale/never-persisted DB value (as happens during
    // read-only admin impersonation, where the save PATCH is blocked) would
    // silently revert a toggle the user just made on every navigation.
    if (role === "PATIENT" && !forcePatientMode && !localStorage.getItem("clinic-locale")) {
      fetch("/api/patient/profile")
        .then(res => res.json())
        .then(data => {
          const dbLocale = data?.user?.preferredLocale;
          if (dbLocale && (dbLocale === "pt-BR" || dbLocale === "en-GB") && !localStorage.getItem("clinic-locale")) {
            setLocale(dbLocale);
          }
        })
        .catch(() => {});
    }
    // Fetch patient notification count
    fetch("/api/patient/notifications")
      .then(res => res.json())
      .then(data => {
        if (data.unreadCount !== undefined) setNotifCount(data.unreadCount);
        if (Array.isArray(data.notifications)) setNotifItems(data.notifications);
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
      <PatientSidebar
        notifications={notifCount}
        notificationItems={notifItems}
        consentRequired={consentRequired}
        onPinnedChange={setSidebarPinned}
        offsetForBanner={isImpersonating}
      />

      {/* Main content */}
      <div className={`patient-content-area ${sidebarPinned ? "sidebar-pinned" : ""}`}>
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
