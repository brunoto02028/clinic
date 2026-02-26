"use client";

import { useState, useEffect, ReactNode } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  LayoutDashboard,
  Calendar,
  Users,
  ClipboardList,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  User,
  Bell,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/logo";
import { LocaleToggle } from "@/components/locale-toggle";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import { usePatientAccess } from "@/hooks/use-patient-access";
import { MODULE_REGISTRY, HREF_MODULE_MAP } from "@/lib/module-registry";
import ModuleGate from "@/components/dashboard/module-gate";
import MobilePageHeader from "@/components/dashboard/mobile-page-header";

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
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);

  // Impersonation detection
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedName, setImpersonatedName] = useState<string | null>(null);

  const [portalConfigLoaded, setPortalConfigLoaded] = useState(false);
  const [portalModules, setPortalModules] = useState<{ href: string; label: string; icon: any; alwaysVisible?: boolean; group?: string }[]>([]);
  const [consentRequired, setConsentRequired] = useState(false);
  const { access, loading: accessLoading, canAccessHref } = usePatientAccess();

  const ICON_LOOKUP: Record<string, any> = {
    LayoutDashboard, Calendar, Footprints, FileText, Shield, Users, ClipboardList, GraduationCap, Dumbbell,
    Heart, FileUp, HeartPulse, Activity, CreditCard, Lock, Crown, Scale, User, Map, Trophy, ShoppingCart, BookOpen,
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
    "/dashboard/profile": "patient.profile",
    "/dashboard/clinical-notes": "patient.clinicalNotes",
    "/dashboard/quizzes": "patient.quizzes",
    "/dashboard/achievements": "patient.achievements",
    "/dashboard/journey": "patient.journey",
    "/dashboard/community": "patient.community",
    "/dashboard/marketplace": "patient.marketplace",
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
  const resolvedPatientNav = defaultPatientNavItems.map(item => {
    if (item.alwaysVisible) return { ...item, locked: false };
    const moduleKey = HREF_MODULE_MAP[item.href];
    const isLocked = isPatientRole && moduleKey && access.modules !== "all" && !((access.modules as string[]).includes(moduleKey));
    return { ...item, locked: !!isLocked };
  });
  // BPR Journey items — now driven by portal config (admin can toggle)
  const isPt = locale === "pt-BR";
  const journeyNavItems = resolvedPatientNav.filter((item: any) => item.group === "journey");

  const mainPatientNav = resolvedPatientNav.filter((item: any) => !item.group);
  const navItems = isTherapist ? therapistNavItems : mainPatientNav;

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

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
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 sidebar-futuristic transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-white/5">
            <div className={`transition-opacity duration-200 ${logoReady ? 'opacity-100' : 'opacity-0'}`}>
              <Logo logoUrl={logoUrl} darkLogoUrl={darkLogoUrl} size="sm" linkTo="/dashboard" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item: any) => {
              const isLocked = item.locked === true;
              // In preview mode, map /dashboard → /patient-preview, /dashboard/X → /patient-preview/X
              const previewHref = item.href === "/dashboard"
                ? `/patient-preview${previewQuery}`
                : `/patient-preview${item.href.replace("/dashboard", "")}${previewQuery}`;
              const linkHref = isPatientPreview ? previewHref : item.href;

              const isActive = isPatientPreview
                ? (item.href === "/dashboard" && (pathname === "/patient-preview" || pathname === "/patient-preview/"))
                  || (item.href !== "/dashboard" && pathname?.startsWith(`/patient-preview${item.href.replace("/dashboard", "")}`))
                : pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));

              return (
                <Link key={item.href} href={linkHref}>
                  <div
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg sidebar-nav-item ${
                      isActive
                        ? "sidebar-nav-item-active text-primary"
                        : isLocked
                          ? "text-muted-foreground/50"
                          : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <item.icon className={`h-5 w-5 ${isActive ? "neon-text-cyan" : ""} ${isLocked ? "opacity-50" : ""}`} />
                    <span className={`font-medium flex-1 ${isLocked ? "opacity-50" : ""}`}>{item.label}</span>
                    {isLocked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                </Link>
              );
            })}

            {/* BPR Journey Section (Patient only, driven by portal config) */}
            {!isTherapist && journeyNavItems.length > 0 && (
              <>
                <div className="my-2 px-3">
                  <div className="neon-divider" />
                  <p className="text-[10px] font-semibold text-primary/60 uppercase tracking-wider mt-2">BPR Journey</p>
                </div>
                {journeyNavItems.map((item: any) => {
                  const isLocked = item.locked === true;
                  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
                  return (
                    <Link key={item.href} href={item.href}>
                      <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg sidebar-nav-item ${
                        isActive
                          ? "sidebar-nav-item-active text-primary"
                          : isLocked
                            ? "text-muted-foreground/50"
                            : "text-muted-foreground hover:text-foreground"
                      }`}>
                        <item.icon className={`h-5 w-5 ${isActive ? "neon-text-cyan" : ""} ${isLocked ? "opacity-50" : ""}`} />
                        <span className={`font-medium flex-1 ${isLocked ? "opacity-50" : ""}`}>{item.label}</span>
                        {isLocked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center animate-neon-pulse">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {isImpersonating ? impersonatedName : `${(session?.user as any)?.firstName ?? ""} ${(session?.user as any)?.lastName ?? ""}`}
                </p>
                <Badge
                  variant={isTherapist ? "default" : "secondary"}
                  className="text-xs"
                >
                  {isTherapist ? T("patient.therapist") : T("patient.patient")}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isImpersonating ? (
                <Button
                  variant="outline"
                  className="flex-1 justify-start gap-2 text-blue-400 border-blue-500/20 hover:bg-blue-500/10"
                  onClick={async () => {
                    await fetch("/api/admin/impersonate", { method: "DELETE" });
                    document.cookie = "impersonate-patient-name=; path=/; max-age=0";
                    document.cookie = "impersonate-patient-id=; path=/; max-age=0";
                    document.cookie = "impersonate-admin-id=; path=/; max-age=0";
                    window.location.href = "/admin";
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Voltar ao Admin
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="flex-1 justify-start gap-2 text-muted-foreground"
                  onClick={isPatientPreview ? undefined : handleSignOut}
                  disabled={isPatientPreview}
                >
                  <LogOut className="h-4 w-4" />
                  {T("nav.signOut")}
                </Button>
              )}
              <LocaleToggle />
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 header-futuristic">
          <div className="flex items-center justify-between h-full px-4 lg:px-8">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="hidden lg:block">
              <h1 className="text-lg font-semibold text-foreground">
                {isTherapist ? `${T("patient.therapist")} Portal` : `${T("patient.patient")} Portal`}
              </h1>
            </div>

            {/* Mobile: show current page context */}
            <div className="lg:hidden flex-1 text-center">
              <span className="text-sm font-semibold text-foreground">
                {isTherapist ? `${T("patient.therapist")} Portal` : (isPt ? "Paciente Portal" : "Patient Portal")}
              </span>
            </div>

            <div className="flex items-center gap-2 lg:gap-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
              </Button>
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">
                  {isImpersonating ? impersonatedName : ((session?.user as any)?.firstName ?? "")}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8 pb-24 lg:pb-8">
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
        </main>
      </div>

      {/* Mobile bottom navigation bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 mobile-nav-futuristic safe-area-pb">
        <div className="flex items-stretch h-16">
          {(() => {
            const bottomItems = isTherapist
              ? [
                  { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
                  { href: "/dashboard/appointments", icon: Calendar, label: "Appts" },
                  { href: "/dashboard/patients", icon: Users, label: "Patients" },
                  { href: "/dashboard/scans", icon: Footprints, label: "Scans" },
                  { href: "/dashboard/clinical-notes", icon: ClipboardList, label: "Notes" },
                ]
              : [
                  { href: "/dashboard", icon: LayoutDashboard, label: isPt ? "Início" : "Home" },
                  { href: "/dashboard/appointments", icon: Calendar, label: isPt ? "Agenda" : "Appts" },
                  { href: "/dashboard/membership", icon: Crown, label: isPt ? "Plano" : "Plan" },
                  { href: "/dashboard/treatment", icon: Heart, label: isPt ? "Trat." : "Treat" },
                  { href: "/dashboard/profile", icon: User, label: isPt ? "Perfil" : "Profile" },
                ];
            return bottomItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} className="flex-1">
                  <div className={`relative flex flex-col items-center justify-center h-full gap-0.5 transition-colors ${
                    isActive ? "mobile-nav-item-active" : "text-muted-foreground"
                  }`}>
                    <item.icon className={`h-5 w-5`} />
                    <span className="text-[10px] font-medium">{item.label}</span>
                    {isActive && <div className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-t-full shadow-[0_0_8px_rgba(74,124,138,0.5)]" />}
                  </div>
                </Link>
              );
            });
          })()}
        </div>
      </nav>
    </div>
  );
}
