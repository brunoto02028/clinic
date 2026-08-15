"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LogOut, Menu, X, Bell } from "lucide-react";
import {
  PATIENT_SECTIONS,
  PATIENT_PROFILE_SECTION,
  getActivePatientSection,
} from "@/lib/patient-sections";
import { MODULE_REGISTRY } from "@/lib/module-registry";
import { usePatientAccess } from "@/hooks/use-patient-access";
import { Logo } from "@/components/ui/logo";
import { useLocale } from "@/hooks/use-locale";

interface NotificationItem {
  id: string;
  title: string;
  titlePt: string;
  message: string;
  messagePt: string;
  link: string;
  isUrgent?: boolean;
}

interface PatientSidebarProps {
  notifications?: number;
  notificationItems?: NotificationItem[];
  consentRequired?: boolean;
}

export default function PatientSidebar({
  notifications = 0,
  notificationItems = [],
  consentRequired = false,
}: PatientSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { locale, setLocale } = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [darkLogoUrl, setDarkLogoUrl] = useState<string | null>(null);
  const [logoReady, setLogoReady] = useState(false);
  const [pendingQuestions, setPendingQuestions] = useState(0);

  const activeSection = getActivePatientSection(pathname);
  const isPt = locale?.startsWith("pt");

  /**
   * The menu used to be a fixed list of seven, no matter what the clinic had
   * granted. Of the twenty modules the permissions screen offers, fourteen had
   * no entry here at all — so switching one on changed nothing the patient
   * could see, and switching one off left it in the menu, blocked on click.
   *
   * The curated sections keep their wording and icons where they exist; a
   * granted module without one falls back to its registry entry rather than
   * staying invisible.
   */
  const { access, loading: accessLoading, hasModule, isModuleHidden } = usePatientAccess();

  const moduleByHref = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of MODULE_REGISTRY) if (m.href) map.set(m.href, m.key);
    return map;
  }, []);

  const visibleSections = useMemo(() => {
    // Until access is known, show the curated set — blanking the menu on every
    // page load would read as breakage.
    if (accessLoading) return PATIENT_SECTIONS;

    const allowed = (href: string) => {
      const key = moduleByHref.get(href);
      if (!key) return true; // no module governs it (e.g. Messages)
      return hasModule(key) && !isModuleHidden(key);
    };

    const curated = PATIENT_SECTIONS.filter((s) => allowed(s.href));
    const curatedHrefs = new Set(PATIENT_SECTIONS.map((s) => s.href));

    const extra = MODULE_REGISTRY.filter(
      (m) =>
        m.href &&
        !curatedHrefs.has(m.href) &&
        m.href !== PATIENT_PROFILE_SECTION.href &&
        hasModule(m.key) &&
        !isModuleHidden(m.key)
    ).map((m) => ({
      key: m.key,
      label: m.label,
      labelPt: m.labelPt || m.label,
      icon: m.icon,
      href: m.href as string,
      matchRoutes: [m.href as string],
    }));

    return [...curated, ...extra];
  }, [accessLoading, hasModule, isModuleHidden, moduleByHref]);

  const user = session?.user as any;
  const firstName = user?.firstName || user?.name?.split(" ")[0] || "";
  const lastName = user?.lastName || "";

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          const sl = data.screenLogos;
          const screen = sl?.patientDashboard || sl?.adminLogin;
          setLogoUrl(screen?.logoUrl || data.logoUrl || null);
          setDarkLogoUrl(screen?.darkLogoUrl || data.darkLogoUrl || null);
        }
        setLogoReady(true);
      })
      .catch(() => setLogoReady(true));
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setNotifOpen(false);
  }, [pathname]);

  useEffect(() => {
    Promise.all([
      fetch("/api/patient/questions").then(r => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/patient/messages").then(r => r.ok ? r.json() : []).catch(() => []),
    ])
      .then(([qData, mData]) => {
        const pending = Array.isArray(qData) ? qData.filter((q: any) => q.status === "pending").length : 0;
        const unread = Array.isArray(mData) ? mData.filter((m: any) => m.senderRole === "staff" && !m.readAt).length : 0;
        setPendingQuestions(pending + unread);
      })
      .catch(() => {});
  }, [pathname]);

  const navItemClass = (active: boolean) =>
    `group relative flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-colors w-full ${
      active
        ? "bg-[#4F7361]/10 text-[#4F7361] font-medium"
        : "text-[#767B85] hover:text-[#20242D] hover:bg-black/[0.03]"
    }`;

  const activeBar = (
    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[#4F7361]" />
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-3 left-3 z-50 lg:hidden p-2 rounded-lg bg-white/90 backdrop-blur border border-black/10 shadow-sm"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={isPt ? "Abrir menu" : "Toggle menu"}
      >
        {mobileOpen ? <X size={18} className="text-[#20242D]" /> : <Menu size={18} className="text-[#20242D]" />}
      </button>

      {/* Mobile notification
       *
       * This used to be a Link to /dashboard with a count badge on it. Tapping
       * it navigated home and showed no notification at all — and for a patient
       * still behind the consent gate, every page renders that same gate, so
       * the screen did not change by a single pixel. A patient reported it as
       * her phone freezing, which is exactly what a button that does nothing
       * looks like. It now opens the items the badge is counting, and stays out
       * of the way entirely while consent is the only thing she can act on. */}
      {!consentRequired && (
        <div className="fixed top-3 right-3 z-50 lg:hidden">
          <button
            type="button"
            onClick={() => setNotifOpen((o) => !o)}
            aria-label={isPt ? "Notificações" : "Notifications"}
            aria-expanded={notifOpen}
            className="relative p-2 rounded-lg bg-white/90 backdrop-blur border border-black/10 shadow-sm inline-flex text-[#20242D]"
          >
            <Bell size={18} />
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#4F7361] text-[9px] text-white flex items-center justify-center font-bold">
                {notifications > 9 ? "9+" : notifications}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div
                className="fixed inset-0 -z-10"
                onClick={() => setNotifOpen(false)}
                aria-hidden
              />
              <div className="absolute right-0 mt-2 w-[280px] max-h-[60vh] overflow-y-auto rounded-xl bg-white border border-black/10 shadow-lg py-1">
                {notificationItems.length === 0 ? (
                  <p className="px-4 py-6 text-center text-[13px] text-[#767B85]">
                    {isPt ? "Nada pendente por agora." : "Nothing pending right now."}
                  </p>
                ) : (
                  notificationItems.map((n) => (
                    <Link
                      key={n.id}
                      href={n.link}
                      onClick={() => setNotifOpen(false)}
                      className="block px-4 py-3 hover:bg-black/[0.03] border-b border-black/5 last:border-0"
                    >
                      <p className={`text-[13px] font-medium ${n.isUrgent ? "text-[#B4413C]" : "text-[#20242D]"}`}>
                        {isPt ? n.titlePt : n.title}
                      </p>
                      <p className="text-[11px] text-[#767B85] mt-0.5">
                        {isPt ? n.messagePt : n.message}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav
        className={`patient-sidebar ${mobileOpen ? "mobile-open" : ""}`}
        style={{
          width: 220,
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 40,
          display: "flex",
          flexDirection: "column",
          background: "#FFFFFF",
          borderRight: "1px solid #E4E3DF",
        }}
        aria-label={isPt ? "Navegação do paciente" : "Patient navigation"}
      >
        {/* Logo + name */}
        <div
          className={`px-4 pt-5 pb-4 border-b border-black/[0.06] transition-opacity duration-200 ${
            logoReady ? "opacity-100" : "opacity-0"
          }`}
        >
          <Logo
            logoUrl={logoUrl}
            darkLogoUrl={darkLogoUrl}
            size="sm"
            showText={true}
            linkTo="/dashboard"
          />
          <p className="text-[11px] text-[#767B85] mt-2 truncate">
            {firstName} {lastName}
          </p>
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {visibleSections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection.key === section.key;

            return (
              <Link
                key={section.key}
                href={section.href}
                className={navItemClass(isActive)}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && activeBar}
                <Icon size={18} className="flex-shrink-0" />
                <span className="flex-1">{isPt ? section.labelPt : section.label}</span>
                {section.key === "questions" && pendingQuestions > 0 && (
                  <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-amber-400 text-black text-[10px] font-bold flex items-center justify-center px-1">
                    {pendingQuestions > 9 ? "9+" : pendingQuestions}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-2 py-3 border-t border-black/[0.06] space-y-0.5">
          {/* Language toggle */}
          <div className="flex items-center gap-1 px-3 py-2">
            {(["en-GB", "pt-BR"] as const).map((loc) => (
              <button
                key={loc}
                onClick={() => {
                  setLocale(loc);
                  fetch("/api/patient/profile", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ preferredLocale: loc }),
                  }).catch(() => {});
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  locale === loc
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-[#767B85] hover:text-foreground border border-transparent"
                }`}
              >
                {loc === "en-GB" ? "EN" : "PT"}
              </button>
            ))}
          </div>
          <Link
            href={PATIENT_PROFILE_SECTION.href}
            className={navItemClass(activeSection.key === "profile")}
          >
            {activeSection.key === "profile" && activeBar}
            <PATIENT_PROFILE_SECTION.icon size={18} className="flex-shrink-0" />
            <span>
              {isPt
                ? PATIENT_PROFILE_SECTION.labelPt
                : PATIENT_PROFILE_SECTION.label}
            </span>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-[13px] text-[#767B85] hover:text-red-500 hover:bg-black/[0.03] transition-colors w-full"
          >
            <LogOut size={16} className="flex-shrink-0" />
            <span>{isPt ? "Sair" : "Sign out"}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
