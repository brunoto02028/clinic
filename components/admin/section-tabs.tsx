"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getActiveAdminNav, tabAllowedFor } from "@/lib/admin-sections";
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

  return (
    <div className="section-tabs" role="tablist" aria-label={relabel(isPt ? section.labelPt : section.label)}>
      {section.tabs
        .filter((tab) => (!isPersonal || !tab.clinicalOnly) && tabAllowedFor(tab, role))
        .map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`section-tab ${activeTab?.key === tab.key ? "active" : ""}`}
            role="tab"
            aria-selected={activeTab?.key === tab.key}
          >
            {relabel(isPt ? tab.labelPt : tab.label)}
          </Link>
        ))}
    </div>
  );
}
