"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getActiveAdminNav, tabAllowedFor, routeMatches } from "@/lib/admin-sections";
import { useLocale } from "@/hooks/use-locale";
import { useVocab } from "@/hooks/use-vocab";

// `role` is required on purpose: without it every superadminOnly/ownerOnly tab
// would silently disappear, even for the platform owner.
export default function SectionTabs({ role }: { role: string | undefined }) {
  const pathname = usePathname();
  const { locale } = useLocale();
  const { relabel, isPersonal } = useVocab();
  const activeNav = getActiveAdminNav(pathname);

  if (!activeNav) return null;

  const { section, tab: activeTab } = activeNav;
  const isPt = locale?.startsWith("pt");
  // Same rule as the sidebar (visibleAdminSections): clinical tabs off for a
  // studio, studio tabs off for a clinic.
  const tabs = section.tabs.filter(
    (tab) => (isPersonal ? !tab.clinicalOnly : !tab.personalOnly) && tabAllowedFor(tab, role)
  );
  // The route's first matching tab may be one this tenant can't see (e.g. the
  // clinic's Journey on /admin/quizzes for a studio) — highlight a visible one.
  const clean = pathname.replace(/\/$/, "") || "/admin";
  const activeKey = tabs.some((t) => t.key === activeTab?.key)
    ? activeTab?.key
    : tabs.find((t) => [t.href, ...(t.matchRoutes || [])].some((r) => routeMatches(clean, r)))?.key;

  return (
    <div className="section-tabs" role="tablist" aria-label={relabel(isPt ? section.labelPt : section.label)}>
      {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`section-tab ${activeKey === tab.key ? "active" : ""}`}
            role="tab"
            aria-selected={activeKey === tab.key}
          >
            {relabel(isPt ? tab.labelPt : tab.label)}
          </Link>
        ))}
    </div>
  );
}
