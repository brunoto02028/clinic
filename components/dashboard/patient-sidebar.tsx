"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LogOut, Menu, X, Bell } from "lucide-react";
import {
  PATIENT_SECTIONS,
  PATIENT_PROFILE_SECTION,
  getActivePatientSection,
} from "@/lib/patient-sections";
import { Logo } from "@/components/ui/logo";

interface PatientSidebarProps {
  notifications?: number;
}

export default function PatientSidebar({ notifications = 0 }: PatientSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [darkLogoUrl, setDarkLogoUrl] = useState<string | null>(null);
  const [logoReady, setLogoReady] = useState(false);

  const activeSection = getActivePatientSection(pathname);

  const user = session?.user as any;
  const firstName = user?.firstName || user?.name?.split(" ")[0] || "";
  const lastName = user?.lastName || "";

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
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
  }, [pathname]);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed top-3 left-3 z-50 lg:hidden p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border/30"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile notification bell */}
      <div className="fixed top-3 right-3 z-50 lg:hidden">
        <Link href="/dashboard" className="relative p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border/30 inline-flex">
          <Bell size={20} />
          {notifications > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-bold">
              {notifications > 9 ? "9+" : notifications}
            </span>
          )}
        </Link>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav
        className={`patient-sidebar ${mobileOpen ? "mobile-open" : ""}`}
        aria-label="Patient navigation"
      >
        {/* Logo + user name */}
        <div className="px-3 mb-6">
          <div className={`transition-opacity duration-200 ${logoReady ? "opacity-100" : "opacity-0"}`}>
            <Logo logoUrl={logoUrl} darkLogoUrl={darkLogoUrl} size="sm" showText={true} linkTo="/dashboard" />
          </div>
          <p className="text-xs text-muted-foreground truncate mt-1">
            {firstName} {lastName}
          </p>
        </div>

        {/* Main nav items */}
        <div className="flex flex-col flex-1">
          {PATIENT_SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection.key === section.key;

            return (
              <Link
                key={section.key}
                href={section.href}
                className={`patient-nav-item ${isActive ? "active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={20} />
                <span>{section.labelPt}</span>
              </Link>
            );
          })}
        </div>

        {/* Bottom: profile + sign out */}
        <div className="border-t border-border/10 pt-3 mt-auto">
          <Link
            href={PATIENT_PROFILE_SECTION.href}
            className={`patient-nav-item ${activeSection.key === "profile" ? "active" : ""}`}
          >
            <PATIENT_PROFILE_SECTION.icon size={20} />
            <span>{PATIENT_PROFILE_SECTION.labelPt}</span>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="patient-nav-item w-full text-muted-foreground/50 hover:text-destructive"
          >
            <LogOut size={18} />
            <span className="text-xs">Sair</span>
          </button>
        </div>
      </nav>
    </>
  );
}
