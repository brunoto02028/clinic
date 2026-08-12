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
import { useLocale } from "@/hooks/use-locale";

interface PatientSidebarProps {
  notifications?: number;
}

export default function PatientSidebar({ notifications = 0 }: PatientSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { locale, setLocale } = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [darkLogoUrl, setDarkLogoUrl] = useState<string | null>(null);
  const [logoReady, setLogoReady] = useState(false);
  const [pendingQuestions, setPendingQuestions] = useState(0);

  const activeSection = getActivePatientSection(pathname);
  const isPt = locale?.startsWith("pt");

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

      {/* Mobile notification */}
      <div className="fixed top-3 right-3 z-50 lg:hidden">
        <Link
          href="/dashboard"
          className="relative p-2 rounded-lg bg-white/90 backdrop-blur border border-black/10 shadow-sm inline-flex text-[#20242D]"
        >
          <Bell size={18} />
          {notifications > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#4F7361] text-[9px] text-white flex items-center justify-center font-bold">
              {notifications > 9 ? "9+" : notifications}
            </span>
          )}
        </Link>
      </div>

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
          {PATIENT_SECTIONS.map((section) => {
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
