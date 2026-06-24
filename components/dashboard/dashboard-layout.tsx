"use client";

import { useState, useEffect, ReactNode } from "react";
import { PullToRefresh } from "@/components/dashboard/pull-to-refresh";
import { useSession } from "next-auth/react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  LayoutDashboard,
  Calendar,
  Users,
  ClipboardList,
  FileText,
  User,
  Shield,
  Footprints,
  GraduationCap,
  Dumbbell,
  Heart,
  FileUp,
  HeartPulse,
  CreditCard,
  Scale,
  Lock,
  Crown,
  Map,
  Trophy,
  ShoppingCart,
  BookOpen,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import { usePatientAccess } from "@/hooks/use-patient-access";
import { MODULE_REGISTRY, HREF_MODULE_MAP } from "@/lib/module-registry";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const previewQuery = previewPatientId ? `?pid=${previewPatientId}&pname=${searchParams?.get("pname") || ""}` : "";
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [darkLogoUrl, setDarkLogoUrl] = useState<string | null>(null);
  const [logoReady, setLogoReady] = useState(false);
  const { locale, setLocale } = useLocale();
  const T = (key: string) => i18nT(key, locale);

  // Impersonation detection
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedName, setImpersonatedName] = useState<string | null>(null);

  const [portalConfigLoaded, setPortalConfigLoaded] = useState(false);
  const [portalModules, setPortalModules] = useState<{ href: string; label: string; icon: any; alwaysVisible?: boolean; group?: string }[]>([]);
  const [consentRequired, setConsentRequired] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifCount, setNotifCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const { access, loading: accessLoading, canAccessHref, isModuleHidden } = usePatientAccess();

  const ICON_LOOKUP: Record<string, any> = {
    LayoutDashboard, Calendar, Footprints, FileText, Shield, Users, ClipboardList, GraduationCap, Dumbbell,
    Heart, FileUp, HeartPulse, Activity, CreditCard, Lock, Crown, Scale, User, Map, Trophy, ShoppingCart, BookOpen,
    Brain,
  };

  // Map module href → i18n key for translated labels
  const HREF_I18N: Record<string, string> = {
    "/dashboard": "patient.dashboard",
    "/dashboard/appointments": "patient.appointments",
    "/dashboard/scans": "patient.footScans",
    "/dashboard/body-assessments": "patient.bodyAssessment",
    "/dashboard/records": "patient.myRecords",
    "/dashboard/screening": "patient.medicalScreening",
    "/dashboard/education": "patient.education",
    "/dashboard/exercises": "patient.myExercises",
    "/dashboard/treatment": "patient.treatment",
    "/dashboard/documents": "patient.myDocuments",
    "/dashboard/blood-pressure": "patient.bloodPressure",
    "/dashboard/membership": "patient.plans",
    "/dashboard/consent": "patient.consent",
    "/dashboard/guide": "patient.guide",
    "/dashboard/profile": "patient.profile",
    "/dashboard/tasks": "patient.tasks",
    "/dashboard/recordings": "patient.recordings",
    "/dashboard/clinical-notes": "patient.clinicalNotes",
    "/dashboard/quizzes": "patient.quizzes",
    "/dashboard/achievements": "patient.achievements",
    "/dashboard/journey": "patient.journey",
    "/dashboard/community": "patient.community",
    "/dashboard/marketplace": "patient.marketplace",
    "/dashboard/biohacking": "patient.biohacking",
  };

  // Map href → MODULE_REGISTRY alwaysVisible flag
  const ALWAYS_VISIBLE_HREFS = new Set(
    MODULE_REGISTRY.filter(m => m.alwaysVisible).map(m => m.href)
  );

  useEffect(() => {
    setMounted(true);
    // Detect impersonation cookie
    const cookieMatch = document.cookie.match(/(^| )impersonate-patient-name=([^;]+)/);
    if (cookieMatch) {
      setIsImpersonating(true);
      setImpersonatedName(decodeURIComponent(cookieMatch[2]));
    }
    // Fetch site settings for logo
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        const sl = data.screenLogos?.dashboard;
        setLogoUrl(sl?.logoUrl || data.logoUrl || null);
        setDarkLogoUrl(sl?.darkLogoUrl || data.darkLogoUrl || null);
        setLogoReady(true);
      })
      .catch(err => {
        console.error("Failed to fetch settings:", err);
        setLogoReady(true);
      });
    // Fetch patient portal config — this is the source of truth for module order
    fetch("/api/patient-portal-config", { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        if (data?.modules) {
          const items = data.modules
            .filter((m: any) => m.enabled)
            .sort((a: any, b: any) => a.order - b.order)
            .map((m: any) => ({
              href: m.href,
              label: m.label,
              icon: ICON_LOOKUP[m.icon] || LayoutDashboard,
              alwaysVisible: ALWAYS_VISIBLE_HREFS.has(m.href),
              group: m.group || undefined,
            }));
          setPortalModules(items);
        }
        setPortalConfigLoaded(true);
      })
      .catch(() => setPortalConfigLoaded(true));
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
    // Fetch patient notifications
    fetch("/api/patient/notifications")
      .then(res => res.json())
      .then(data => {
        if (data.notifications) setNotifications(data.notifications);
        if (data.unreadCount !== undefined) setNotifCount(data.unreadCount);
      })
      .catch(() => {});
  }, []);

  const userRole = (session?.user as any)?.role || "PATIENT";
  const isTherapist = !isPatientPreview && !isImpersonating && (userRole === "ADMIN" || userRole === "SUPERADMIN" || userRole === "THERAPIST");

  // Build patient nav from admin portal config (order = admin-configured)
  // Use i18n label if available, otherwise fallback to the admin-set label
  const patientNavFromConfig = portalModules.map(m => {
    const i18nKey = HREF_I18N[m.href];
    const translated = i18nKey ? T(i18nKey) : "";
    const label = (translated && translated !== i18nKey) ? translated : m.label;
    return { href: m.href, label, icon: m.icon, locked: false, alwaysVisible: m.alwaysVisible, group: m.group };
  });

  // Fallback: if portal config hasn't loaded yet, use MODULE_REGISTRY sorted alphabetically
  const fallbackPatientNav = MODULE_REGISTRY
    .filter(m => m.category !== "admin_only")
    .map(m => {
      const i18nKey = HREF_I18N[m.href];
      const translated = i18nKey ? T(i18nKey) : "";
      const label = (translated && translated !== i18nKey) ? translated : m.label;
      return { href: m.href, label, icon: m.icon, locked: false, alwaysVisible: m.alwaysVisible };
    })
    .sort((a, b) => {
      if (a.href === "/dashboard") return -1;
      if (b.href === "/dashboard") return 1;
      return a.label.localeCompare(b.label, locale);
    });

  // While config is loading, show empty array to prevent flicker (no fallback with wrong order)
  const defaultPatientNavItems = portalConfigLoaded
    ? (patientNavFromConfig.length > 0 ? patientNavFromConfig : fallbackPatientNav)
    : [];

  const therapistNavItems = [
    { href: "/dashboard", label: T("patient.dashboard"), icon: LayoutDashboard },
    { href: "/dashboard/appointments", label: T("patient.appointments"), icon: Calendar },
    { href: "/dashboard/patients", label: T("nav.patients"), icon: Users },
    { href: "/dashboard/scans", label: T("patient.footScans"), icon: Footprints },
    { href: "/dashboard/body-assessments", label: T("patient.bodyAssessment"), icon: Activity },
    { href: "/dashboard/clinical-notes", label: T("nav.clinicalNotes"), icon: ClipboardList },
    { href: "/dashboard/education", label: T("patient.education"), icon: GraduationCap },
  ];

  // Resolve nav items — mark locked modules for patients
  const isPatientRole = !isTherapist && !isPatientPreview;
  const resolvedPatientNav = defaultPatientNavItems
    .filter(item => {
      // Hide modules that admin marked as "hidden" for this patient
      if (isPatientRole) {
        const moduleKey = HREF_MODULE_MAP[item.href];
        if (moduleKey && isModuleHidden(moduleKey)) return false;
      }
      return true;
    })
    .map(item => {
      if (item.alwaysVisible) return { ...item, locked: false };
      // While access is loading, don't show locks (avoids flash of locked state)
      if (accessLoading) return { ...item, locked: false };
      // VIP full access override — never lock anything
      if (access.fullAccessOverride) return { ...item, locked: false };
      if (access.modules === "all") return { ...item, locked: false };
      const moduleKey = HREF_MODULE_MAP[item.href];
      const isLocked = isPatientRole && moduleKey && !((access.modules as string[]).includes(moduleKey));
      return { ...item, locked: !!isLocked };
    });
  // BPR Journey items — now driven by portal config (admin can toggle)
  const isPt = locale === "pt-BR";
  const journeyNavItems = resolvedPatientNav.filter((item: any) => item.group === "journey");

  const mainPatientNav = resolvedPatientNav.filter((item: any) => !item.group);
  const navItems = isTherapist ? therapistNavItems : mainPatientNav;

  if (!mounted || status === "loading") {
    return (
      <div className="min-h-screen bg-background bg-grid-pattern flex items-center justify-center">
        <div className="animate-neon-pulse rounded-full p-4">
          <Activity className="h-12 w-12 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-grid-pattern">
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
