"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Menu, X, UserCog } from "lucide-react";
import { ADMIN_SECTIONS, visibleAdminSections, getActiveAdminNav, type AdminSection } from "@/lib/admin-sections";
import { Logo } from "@/components/ui/logo";
import { ClinicSelector } from "./clinic-selector";
import { LocaleToggle } from "@/components/locale-toggle";
import { useLocale } from "@/hooks/use-locale";
import { useVocab } from "@/hooks/use-vocab";

interface AdminMiniSidebarProps {
  user: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    role?: string;
    clinicId?: string;
    clinicName?: string;
    permissions?: Record<string, boolean>;
  };
}

export default function AdminMiniSidebar({ user }: AdminMiniSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const collapseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [darkLogoUrl, setDarkLogoUrl] = useState<string | null>(null);
  const [logoReady, setLogoReady] = useState(false);
  const [pendingPatients, setPendingPatients] = useState(0);
  const { locale } = useLocale();
  const { relabel, isPersonal } = useVocab();

  const activeNav = getActiveAdminNav(pathname);
  const isSuperAdmin = user.role === "SUPERADMIN";
  const isPt = locale?.startsWith("pt");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          const sl = data.screenLogos;
          const screen = sl?.adminSidebar || sl?.adminLogin;
          setLogoUrl(screen?.logoUrl || data.logoUrl || null);
          setDarkLogoUrl(screen?.darkLogoUrl || data.darkLogoUrl || null);
        }
        setLogoReady(true);
      })
      .catch(() => setLogoReady(true));
  }, []);

  useEffect(() => {
    const fetchPending = () => {
      fetch("/api/admin/pending-count")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.pendingPatients !== undefined) setPendingPatients(data.pendingPatients);
        })
        .catch(() => {});
    };
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, []);

  const initials =
    [user.firstName?.[0], user.lastName?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || "?";

  const handleSectionClick = (section: AdminSection) => {
    router.push(section.tabs[0]?.href || "/admin");
    setMobileOpen(false);
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (collapseTimeout.current) clearTimeout(collapseTimeout.current);
    };
  }, []);

  // Hover over any part of the rail expands the whole sidebar (desktop only —
  // the mobile drawer, driven by `mobileOpen`, always renders at full width
  // via CSS and ignores this state). A short leave-delay avoids collapsing
  // on a quick pass of the mouse across the rail.
  const handleMouseEnter = () => {
    if (collapseTimeout.current) {
      clearTimeout(collapseTimeout.current);
      collapseTimeout.current = null;
    }
    setExpanded(true);
  };
  const handleMouseLeave = () => {
    collapseTimeout.current = setTimeout(() => setExpanded(false), 150);
  };

  // Keyboard-only users never trigger mouseenter — without this, tabbing
  // through the collapsed rail would only ever show icons, with no way to
  // read the labels. Focus/blur bubble from descendants (React 17+ uses
  // native focusin/focusout), so this mirrors the hover handlers for the
  // whole nav from a single pair of listeners.
  const handleFocus = handleMouseEnter;
  const handleBlur = handleMouseLeave;

  // The mobile drawer (opened via the hamburger) always renders at full
  // width via CSS regardless of hover — it has no hover on touch, so labels
  // must show there too, not just when the desktop rail is hover-expanded.
  const showLabels = expanded || mobileOpen;
  const hasLogoImage = !!(logoUrl || darkLogoUrl);

  const sections = visibleAdminSections(isPersonal);
  const mainSections = sections.filter((s) => s.key !== "settings");
  const settingsSection = sections.find((s) => s.key === "settings");

  const navItemClass = (active: boolean) =>
    `group relative flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-colors cursor-pointer w-full text-left overflow-hidden ${
      active
        ? "bg-[hsl(var(--primary))]/10 text-[hsl(var(--accent-bright))] font-medium"
        : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-white/[0.03]"
    }`;

  // Labels fade out (not display:none) so the width transition on the <nav>
  // stays smooth; collapsed labels are also non-interactive/off-screen so
  // they can't be tabbed to or accidentally clicked while invisible.
  const labelClass = `flex-1 whitespace-nowrap transition-opacity duration-150 ${
    showLabels ? "opacity-100" : "opacity-0 pointer-events-none"
  }`;

  const activeBar = (
    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[hsl(var(--accent-bright))] shadow-[0_0_8px_hsl(var(--accent-bright)/0.4)]" />
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-3 left-3 z-50 lg:hidden p-2 rounded-lg bg-[hsl(var(--background))]/90 backdrop-blur border border-white/10"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav
        className={`admin-mini-sidebar ${mobileOpen ? "mobile-open" : ""} ${expanded ? "expanded" : ""}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 40,
          display: "flex",
          flexDirection: "column",
          background: "hsl(var(--background))",
          borderRight: "1px solid hsl(var(--border))",
        }}
        aria-label="Admin navigation"
      >
        {/* Logo — clipped to the collapsed rail's inner width so a wide
            (icon + wordmark) logo image doesn't overflow the 68px rail; the
            `Logo` component itself doesn't support hiding its own text
            (`showText` is a no-op there), so clipping is done here instead.
            Only clip when there's an actual logo image: the "BPR" text
            fallback (no image configured) doesn't scale down like an image
            does, so a hard 36px clip would just truncate the word. */}
        <div
          className={`px-4 pt-5 pb-4 border-b border-white/[0.06] transition-opacity duration-200 overflow-hidden ${
            logoReady ? "opacity-100" : "opacity-0"
          }`}
        >
          <div
            className="overflow-hidden"
            style={{ width: showLabels || !hasLogoImage ? "auto" : 36, transition: "width 0.2s ease" }}
          >
            <Logo
              logoUrl={logoUrl}
              darkLogoUrl={darkLogoUrl}
              size="sm"
              linkTo="/admin"
              variant="dark"
            />
          </div>
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5">
          {mainSections.map((section) => {
            const Icon = section.icon;
            const isActive = activeNav?.section.key === section.key;

            return (
              <button
                key={section.key}
                className={navItemClass(isActive)}
                onClick={() => handleSectionClick(section)}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && activeBar}
                <Icon size={18} className="flex-shrink-0" />
                <span className={labelClass}>{relabel(isPt ? section.labelPt : section.label)}</span>
                {section.key === "patients" && pendingPatients > 0 && (
                  <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 flex-shrink-0">
                    {pendingPatients > 9 ? "9+" : pendingPatients}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-2 py-3 border-t border-white/[0.06] space-y-1 overflow-hidden">
          {/* Settings */}
          {settingsSection && (
            <button
              className={navItemClass(activeNav?.section.key === "settings")}
              onClick={() => handleSectionClick(settingsSection)}
            >
              {activeNav?.section.key === "settings" && activeBar}
              <settingsSection.icon size={18} className="flex-shrink-0" />
              <span className={labelClass}>
                {relabel(isPt ? settingsSection.labelPt : settingsSection.label)}
              </span>
            </button>
          )}

          {/* Clinic selector — needs room for its own dropdown content, not
              just a label, so it's only visible expanded. Stays mounted
              (visually collapsed via max-height/opacity) instead of
              conditionally rendered: unmounting on every mouse-leave and
              remounting on every hover re-fires its data fetches. */}
          {isSuperAdmin && (
            <div
              className={`px-1 overflow-hidden transition-[opacity,max-height] duration-150 ${
                showLabels ? "opacity-100 max-h-20 py-1" : "opacity-0 max-h-0 py-0 pointer-events-none"
              }`}
            >
              <ClinicSelector />
            </div>
          )}

          {/* Locale — same reasoning as the clinic selector */}
          <div
            className={`px-1 overflow-hidden transition-[opacity,max-height] duration-150 ${
              showLabels ? "opacity-100 max-h-20 py-1" : "opacity-0 max-h-0 py-0 pointer-events-none"
            }`}
          >
            <LocaleToggle />
          </div>

          {/* User */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-md overflow-hidden">
            <div className="w-7 h-7 rounded-md bg-[hsl(var(--primary))]/20 text-[hsl(var(--accent-bright))] text-[11px] font-semibold flex items-center justify-center flex-shrink-0">
              {initials}
            </div>
            <div className={`flex flex-col min-w-0 whitespace-nowrap transition-opacity duration-150 ${showLabels ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
              <span className="text-[12px] text-[hsl(var(--foreground))] truncate leading-tight">
                {user.firstName} {user.lastName}
              </span>
              <Link
                href="/admin/my-account"
                className="text-[11px] text-[hsl(var(--muted-foreground))] hover:text-primary text-left leading-tight transition-colors flex items-center gap-1"
              >
                <UserCog className="h-2.5 w-2.5" />
                {isPt ? "Minha Conta" : "My Account"}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-[11px] text-[hsl(var(--muted-foreground))] hover:text-red-400 text-left leading-tight transition-colors"
              >
                {isPt ? "Sair" : "Sign out"}
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
