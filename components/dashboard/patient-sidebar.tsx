"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LogOut, Menu, X, Bell, Lock, Pin, PinOff } from "lucide-react";
import {
  PATIENT_SECTIONS,
  PATIENT_PROFILE_SECTION,
  getActivePatientSection,
} from "@/lib/patient-sections";
import { MODULE_REGISTRY } from "@/lib/module-registry";
import { usePatientAccess } from "@/hooks/use-patient-access";
import { Logo } from "@/components/ui/logo";
import { useLocale } from "@/hooks/use-locale";
import { useVocab } from "@/hooks/use-vocab";

// Sections/modules that belong to the clinical side — hidden from a
// personal-trainer studio's students (they get workouts, not clinical notes).
// Hidden from a personal-trainer studio's students: the clinic's clinical
// modules, and the BPR plans/shop — both charge on BPR's Stripe account, never
// the trainer's (activity 52, T-7).
const CLINICAL_PATIENT_KEYS = new Set([
  "health", "screening", "mod_screening", "mod_plans", "mod_marketplace",
  // "Exercises" points at the clinic's treatment page (blocked for studios —
  // their workouts have their own entry) and "How It Works" is BPR's clinical
  // guide (activity 55, T-2).
  "exercises", "mod_guide",
  // Studio students hold every module (activity 55, T-1), so the clinical ones
  // with no curated entry would otherwise surface as extras.
  "mod_recordings", "mod_records", "mod_documents", "mod_clinical_notes",
  // "Learn" lists the tenant's own education content, and a studio can't
  // author any (/admin/education is blocked for it) — always an empty page.
  "learn",
  // BPR's rehab gamification (pain check-ins, treatment-plan missions, the
  // archetype quiz that sells the BPR shop) — hidden for studios (activity 58).
  "mod_journey",
]);

const PIN_STORAGE_KEY = "patient-sidebar-pinned";

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
  /** Lifted to the layout so it can widen .patient-content-area to match. */
  onPinnedChange?: (pinned: boolean) => void;
  /** The impersonation banner is `position: fixed; top: 0; z-[9999]` — above
   * this rail's own z-40, so without pushing the rail down to clear it, the
   * banner silently eats clicks on anything in the sidebar's top strip (the
   * pin toggle included), even though it visually looks clickable underneath. */
  offsetForBanner?: boolean;
}

export default function PatientSidebar({
  notifications = 0,
  notificationItems = [],
  consentRequired = false,
  onPinnedChange,
  offsetForBanner = false,
}: PatientSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { locale, setLocale } = useLocale();
  const { relabel } = useVocab();
  const isPersonal = (session?.user as any)?.clinicType === "PERSONAL_TRAINER";
  // Studio branding for a personal-trainer student — falls back to the platform
  // logo/accent when the studio hasn't set its own.
  const studioLogo = isPersonal ? ((session?.user as any)?.clinicLogoUrl ?? null) : null;
  const studioColor = isPersonal ? ((session?.user as any)?.clinicPrimaryColor ?? null) : null;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [darkLogoUrl, setDarkLogoUrl] = useState<string | null>(null);
  const [logoReady, setLogoReady] = useState(false);
  const [pendingQuestions, setPendingQuestions] = useState(0);

  // Collapsed-icon rail by default, hover-expands (matches the admin sidebar) —
  // "pinned" keeps it expanded permanently and is remembered per browser, same
  // scope as the locale choice (a per-device UI preference, not clinical data).
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const collapseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expanded = pinned || hovered;

  useEffect(() => {
    if (localStorage.getItem(PIN_STORAGE_KEY) === "true") setPinned(true);
  }, []);

  useEffect(() => {
    return () => {
      if (collapseTimeout.current) clearTimeout(collapseTimeout.current);
    };
  }, []);

  const togglePinned = () => {
    setPinned((prev) => {
      const next = !prev;
      localStorage.setItem(PIN_STORAGE_KEY, String(next));
      onPinnedChange?.(next);
      return next;
    });
  };

  const handleMouseEnter = () => {
    if (collapseTimeout.current) {
      clearTimeout(collapseTimeout.current);
      collapseTimeout.current = null;
    }
    setHovered(true);
  };
  const handleMouseLeave = () => {
    collapseTimeout.current = setTimeout(() => setHovered(false), 150);
  };
  // Keyboard-only users never trigger mouseenter — without this, tabbing
  // through the collapsed rail would only ever show icons, with no way to
  // read the labels.
  const handleFocus = handleMouseEnter;
  const handleBlur = handleMouseLeave;

  // The mobile drawer (opened via the hamburger) always renders at full width
  // via CSS regardless of hover — labels must show there too.
  const showLabels = expanded || mobileOpen;

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
    if (accessLoading) return PATIENT_SECTIONS.map((s) => ({ ...s, locked: false }));

    // Three states, not two. A module the patient could buy is not the same as
    // one the clinic deliberately took away: the first still leads to the
    // upgrade screen — which is where the plans are sold — and only the second
    // disappears. Hiding both would have quietly removed the paywall from the
    // menu of every patient without a plan.
    const state = (href: string) => {
      const key = moduleByHref.get(href);
      if (!key) return "open" as const; // nothing governs it (e.g. Messages)
      if (isModuleHidden(key)) return "hidden" as const;
      return hasModule(key) ? ("open" as const) : ("locked" as const);
    };

    const curated = PATIENT_SECTIONS
      // A personal-trainer studio's students see studio sections (Workouts) and
      // never the clinical ones; clinic patients see the inverse.
      .filter((s) => (isPersonal ? !(s.clinicalOnly || CLINICAL_PATIENT_KEYS.has(s.key)) : !s.personalOnly))
      .map((s) => ({ ...s, state: state(s.href) }))
      .filter((s) => s.state !== "hidden")
      .map(({ state, ...s }) => ({ ...s, locked: state === "locked" }));

    const curatedHrefs = new Set(PATIENT_SECTIONS.map((s) => s.href));

    // Modules with no curated entry only appear once granted: showing all
    // fourteen locked would bury the six the patient actually uses.
    const extra = MODULE_REGISTRY.filter(
      (m) =>
        m.href &&
        !curatedHrefs.has(m.href) &&
        m.href !== PATIENT_PROFILE_SECTION.href &&
        !(isPersonal && CLINICAL_PATIENT_KEYS.has(m.key)) &&
        hasModule(m.key) &&
        !isModuleHidden(m.key)
    ).map((m) => ({
      key: m.key,
      label: m.label,
      labelPt: m.labelPt || m.label,
      icon: m.icon,
      href: m.href as string,
      matchRoutes: [m.href as string],
      locked: false,
    }));

    return [...curated, ...extra];
  }, [accessLoading, hasModule, isModuleHidden, moduleByHref, isPersonal]);

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
    `group relative flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-colors w-full overflow-hidden ${
      active
        ? "bg-[#4F7361]/10 text-[#4F7361] font-medium"
        : "text-[#767B85] hover:text-[#20242D] hover:bg-black/[0.03]"
    }`;

  // Labels fade out (not display:none) so the width transition on the <nav>
  // stays smooth; collapsed labels are also non-interactive/off-screen so
  // they can't be tabbed to or accidentally clicked while invisible.
  const labelClass = `whitespace-nowrap transition-opacity duration-150 ${
    showLabels ? "opacity-100" : "opacity-0 pointer-events-none"
  }`;

  const activeBar = (
    <span
      className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[#4F7361]"
      style={studioColor ? { backgroundColor: studioColor } : undefined}
    />
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
                      <p className={`text-[13px] font-medium ${n.isUrgent ? "text-ba1-bad" : "text-[#20242D]"}`}>
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
        className={`patient-sidebar ${mobileOpen ? "mobile-open" : ""} ${expanded ? "expanded" : ""}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={{
          position: "fixed",
          top: offsetForBanner ? 40 : 0,
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
        {/* Logo + name + pin toggle */}
        <div
          className={`px-4 pt-5 pb-4 border-b border-black/[0.06] transition-opacity duration-200 overflow-hidden ${
            logoReady ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            {/* flex-shrink-0: collapsed, the pin button used to squeeze this to ~5px. */}
            <div className="overflow-hidden flex-shrink-0" style={{ width: showLabels ? "auto" : 28, transition: "width 0.2s ease" }}>
              <Logo
                logoUrl={studioLogo ?? logoUrl}
                darkLogoUrl={studioLogo ? null : darkLogoUrl}
                size="sm"
                showText={showLabels}
                linkTo="/dashboard"
              />
            </div>
            {/* Pin: keeps the rail expanded permanently instead of only on hover. */}
            <button
              type="button"
              onClick={togglePinned}
              title={pinned ? (isPt ? "Desafixar menu" : "Unpin menu") : (isPt ? "Fixar menu aberto" : "Pin menu open")}
              aria-pressed={pinned}
              className={`flex-shrink-0 p-1 rounded-md transition-colors ${labelClass} ${
                pinned ? "text-[#4F7361] bg-[#4F7361]/10" : "text-[#767B85] hover:text-[#20242D] hover:bg-black/[0.03]"
              }`}
            >
              {pinned ? <Pin size={14} /> : <PinOff size={14} />}
            </button>
          </div>
          <p className={`text-[11px] text-[#767B85] mt-2 truncate ${labelClass}`}>
            {firstName} {lastName}
          </p>
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5">
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
                <Icon size={18} className={`flex-shrink-0 ${section.locked ? "opacity-40" : ""}`} />
                <span className={`flex-1 ${labelClass} ${section.locked ? "opacity-60" : ""}`}>
                  {relabel(isPt ? section.labelPt : section.label)}
                </span>
                {/* Still a link: it leads to the upgrade screen, which is where
                    the plans are sold. The lock says why, before the click. */}
                {section.locked && (
                  <Lock size={13} className={`ml-auto flex-shrink-0 text-ba1-warn ${labelClass}`} aria-label={isPt ? "Requer plano" : "Requires a plan"} />
                )}
                {section.key === "questions" && pendingQuestions > 0 && (
                  <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-ba1-warn text-white text-[10px] font-bold flex items-center justify-center px-1 flex-shrink-0">
                    {pendingQuestions > 9 ? "9+" : pendingQuestions}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-2 py-3 border-t border-black/[0.06] space-y-0.5 overflow-hidden">
          {/* Language toggle — same reasoning as the clinic selector on the
              admin rail: stays mounted, just visually collapsed, so it isn't
              refetching/remounting on every hover. */}
          <div
            className={`flex items-center gap-1 px-3 overflow-hidden transition-[opacity,max-height] duration-150 ${
              showLabels ? "opacity-100 max-h-12 py-2" : "opacity-0 max-h-0 py-0 pointer-events-none"
            }`}
          >
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
            <span className={labelClass}>
              {relabel(isPt
                ? PATIENT_PROFILE_SECTION.labelPt
                : PATIENT_PROFILE_SECTION.label)}
            </span>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-[13px] text-[#767B85] hover:text-ba1-bad hover:bg-black/[0.03] transition-colors w-full overflow-hidden"
          >
            <LogOut size={16} className="flex-shrink-0" />
            <span className={labelClass}>{isPt ? "Sair" : "Sign out"}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
