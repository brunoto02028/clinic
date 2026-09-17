"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Search, Bell } from "lucide-react";
import { getActiveAdminNav } from "@/lib/admin-sections";
import { useLocale } from "@/hooks/use-locale";
import { useVocab } from "@/hooks/use-vocab";

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  link: string;
}

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
  const { relabel } = useVocab();
  const activeNav = getActiveAdminNav(pathname);
  const isPt = locale?.startsWith("pt");

  const sectionTitle = relabel(
    activeNav
      ? isPt
        ? activeNav.section.labelPt
        : activeNav.section.label
      : isPt
        ? "Painel"
        : "Dashboard"
  );

  const initials = [user.firstName?.[0], user.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "?";

  const searchPlaceholder = relabel(isPt ? "Buscar pacientes..." : "Search patients...");

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/api/admin/notifications")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (data && !cancelled) setNotifications(data.notifications); })
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

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

        <div className="relative">
          <button
            className="admin-header-icon-btn"
            aria-label={isPt ? "Notificacoes" : "Notifications"}
            aria-expanded={notifOpen}
            onClick={() => setNotifOpen((o) => !o)}
          >
            <Bell size={18} />
            {notifications.length > 0 && <span className="admin-header-notif-dot" />}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} aria-hidden />
              <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border bg-popover shadow-lg z-50">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    {isPt ? "Nada pendente por agora." : "Nothing pending right now."}
                  </p>
                ) : (
                  notifications.map((n) => (
                    <Link
                      key={n.id}
                      href={n.link}
                      onClick={() => setNotifOpen(false)}
                      className="block px-4 py-3 hover:bg-muted/50 border-b last:border-0"
                    >
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    </Link>
                  ))
                )}
                <a
                  href="/api/admin/adherence/preview-email"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-2 text-xs text-center text-muted-foreground hover:text-primary bg-muted/30"
                >
                  {isPt ? "Ver modelo do e-mail diário" : "Preview the daily e-mail"}
                </a>
              </div>
            </>
          )}
        </div>

        <div className="admin-header-avatar" title={`${user.firstName || ""} ${user.lastName || ""}`.trim()}>
          {initials}
        </div>
      </div>
    </header>
  );
}
