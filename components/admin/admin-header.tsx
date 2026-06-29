"use client";

import { usePathname } from "next/navigation";
import { Search, Bell } from "lucide-react";
import { getActiveAdminNav } from "@/lib/admin-sections";
import { useLocale } from "@/hooks/use-locale";

interface AdminHeaderProps {
  user: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    role?: string;
  };
}

export default function AdminHeader({ user }: AdminHeaderProps) {
  const pathname = usePathname();
  const { locale } = useLocale();
  const activeNav = getActiveAdminNav(pathname);
  const isPt = locale?.startsWith("pt");

  const sectionTitle = activeNav
    ? isPt
      ? activeNav.section.labelPt
      : activeNav.section.label
    : isPt
      ? "Painel"
      : "Dashboard";

  const initials = [user.firstName?.[0], user.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "?";

  const searchPlaceholder = isPt ? "Buscar pacientes..." : "Search patients...";

  return (
    <header className="admin-header">
      <div className="admin-header-left">
        <h1 className="admin-header-title">{sectionTitle}</h1>
      </div>

      <div className="admin-header-right">
        <div className="admin-header-search">
          <Search size={15} className="admin-header-search-icon" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            className="admin-header-search-input"
            aria-label={searchPlaceholder}
          />
        </div>

        <button
          className="admin-header-icon-btn"
          aria-label={isPt ? "Notificacoes" : "Notifications"}
        >
          <Bell size={18} />
          <span className="admin-header-notif-dot" />
        </button>

        <div className="admin-header-avatar" title={`${user.firstName || ""} ${user.lastName || ""}`.trim()}>
          {initials}
        </div>
      </div>
    </header>
  );
}
