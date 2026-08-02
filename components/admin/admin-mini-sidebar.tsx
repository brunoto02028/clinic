"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Menu, X } from "lucide-react";
import { ADMIN_SECTIONS, getActiveAdminNav, type AdminSection } from "@/lib/admin-sections";
import { Logo } from "@/components/ui/logo";
import { ClinicSelector } from "./clinic-selector";
import { LocaleToggle } from "@/components/locale-toggle";
import { useLocale } from "@/hooks/use-locale";

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
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [darkLogoUrl, setDarkLogoUrl] = useState<string | null>(null);
  const [logoReady, setLogoReady] = useState(false);
  const [pendingPatients, setPendingPatients] = useState(0);
  const { locale } = useLocale();

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

  const mainSections = ADMIN_SECTIONS.filter((s) => s.key !== "settings");
  const settingsSection = ADMIN_SECTIONS.find((s) => s.key === "settings");

  const navItemClass = (active: boolean) =>
    `group relative flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-colors cursor-pointer w-full text-left ${
      active
        ? "bg-[hsl(195,30%,42%)]/10 text-[hsl(174,56%,57%)] font-medium"
        : "text-[hsl(195,20%,65%)] hover:text-[hsl(195,20%,82%)] hover:bg-white/[0.03]"
    }`;

  const activeBar = (
    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[hsl(174,56%,57%)] shadow-[0_0_8px_hsl(174,56%,57%,0.4)]" />
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-3 left-3 z-50 lg:hidden p-2 rounded-lg bg-[hsl(200,40%,7%)]/90 backdrop-blur border border-white/10"
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
        className={`admin-mini-sidebar ${mobileOpen ? "mobile-open" : ""}`}
        style={{
          width: 220,
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 40,
          display: "flex",
          flexDirection: "column",
          background: "hsl(200 40% 5%)",
          borderRight: "1px solid hsl(195 20% 12%)",
        }}
        aria-label="Admin navigation"
      >
        {/* Logo */}
        <div
          className={`px-4 pt-5 pb-4 border-b border-white/[0.06] transition-opacity duration-200 ${
            logoReady ? "opacity-100" : "opacity-0"
          }`}
        >
          <Logo
            logoUrl={logoUrl}
            darkLogoUrl={darkLogoUrl}
            size="sm"
            showText={true}
            linkTo="/admin"
          />
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
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
                <span className="flex-1">{isPt ? section.labelPt : section.label}</span>
                {section.key === "patients" && pendingPatients > 0 && (
                  <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                    {pendingPatients > 9 ? "9+" : pendingPatients}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-2 py-3 border-t border-white/[0.06] space-y-1">
          {/* Settings */}
          {settingsSection && (
            <button
              className={navItemClass(activeNav?.section.key === "settings")}
              onClick={() => handleSectionClick(settingsSection)}
            >
              {activeNav?.section.key === "settings" && activeBar}
              <settingsSection.icon size={18} className="flex-shrink-0" />
              <span>
                {isPt ? settingsSection.labelPt : settingsSection.label}
              </span>
            </button>
          )}

          {/* Clinic selector */}
          {isSuperAdmin && (
            <div className="px-1 py-1">
              <ClinicSelector />
            </div>
          )}

          {/* Locale */}
          <div className="px-1 py-1">
            <LocaleToggle />
          </div>

          {/* User */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-md">
            <div className="w-7 h-7 rounded-md bg-[hsl(195,30%,42%)]/20 text-[hsl(174,56%,57%)] text-[11px] font-semibold flex items-center justify-center flex-shrink-0">
              {initials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] text-[hsl(195,20%,80%)] truncate leading-tight">
                {user.firstName} {user.lastName}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-[11px] text-[hsl(195,20%,50%)] hover:text-red-400 text-left leading-tight transition-colors"
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
