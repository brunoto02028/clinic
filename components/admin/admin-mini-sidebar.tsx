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
  const { locale } = useLocale();

  const activeNav = getActiveAdminNav(pathname);
  const isSuperAdmin = user.role === "SUPERADMIN";
  const isPt = locale?.startsWith("pt");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
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

  const initials = [user.firstName?.[0], user.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "?";

  const handleSectionClick = (section: AdminSection) => {
    const defaultHref = section.tabs[0]?.href || "/admin";
    router.push(defaultHref);
    setMobileOpen(false);
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const mainSections = ADMIN_SECTIONS.filter((s) => s.key !== "settings");
  const settingsSection = ADMIN_SECTIONS.find((s) => s.key === "settings");

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="fixed top-3 left-3 z-50 lg:hidden p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border/30"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav
        className={`admin-mini-sidebar ${mobileOpen ? "mobile-open" : ""}`}
        aria-label="Admin navigation"
      >
        {/* Logo */}
        <div className={`mb-6 flex-shrink-0 transition-opacity duration-200 ${logoReady ? "opacity-100" : "opacity-0"}`}>
          <Logo logoUrl={logoUrl} darkLogoUrl={darkLogoUrl} size="sm" showText={true} linkTo="/admin" />
        </div>

        {/* Main sections */}
        <div className="flex flex-col gap-1 flex-1">
          {mainSections.map((section) => {
            const Icon = section.icon;
            const isActive = activeNav?.section.key === section.key;

            return (
              <button
                key={section.key}
                className={`nav-icon-btn ${isActive ? "active" : ""}`}
                onClick={() => handleSectionClick(section)}
                title={isPt ? section.labelPt : section.label}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={20} className={isActive ? "text-primary" : "text-muted-foreground"} />
                <span className={`nav-label ${isActive ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                  {isPt ? section.labelPt : section.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom area: settings + user */}
        <div className="flex flex-col gap-1 mt-auto pt-4 border-t border-border/10">
          {settingsSection && (
            <button
              className={`nav-icon-btn ${activeNav?.section.key === "settings" ? "active" : ""}`}
              onClick={() => handleSectionClick(settingsSection)}
              title={settingsSection.labelPt}
            >
              <settingsSection.icon
                size={20}
                className={activeNav?.section.key === "settings" ? "text-primary" : "text-muted-foreground"}
              />
              <span className={`nav-label ${activeNav?.section.key === "settings" ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                {settingsSection.labelPt}
              </span>
            </button>
          )}

          {/* Clinic selector (SUPERADMIN only) */}
          {isSuperAdmin && (
            <div className="w-full px-2">
              <ClinicSelector />
            </div>
          )}

          {/* Locale toggle */}
          <div className="px-2">
            <LocaleToggle />
          </div>

          {/* User avatar + sign out */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold flex-shrink-0">
              {initials}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs text-foreground truncate">
                {user.firstName} {user.lastName}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-xs text-muted-foreground hover:text-destructive text-left"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
