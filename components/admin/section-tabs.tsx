"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getActiveAdminNav } from "@/lib/admin-sections";
import { useLocale } from "@/hooks/use-locale";
import { useVocab } from "@/hooks/use-vocab";

export default function SectionTabs() {
  const pathname = usePathname();
  const { locale } = useLocale();
  const { relabel, isPersonal } = useVocab();
  const activeNav = getActiveAdminNav(pathname);

  if (!activeNav) return null;

  const { section, tab: activeTab } = activeNav;
  const isPt = locale?.startsWith("pt");

  return (
    <div className="section-tabs" role="tablist" aria-label={relabel(isPt ? section.labelPt : section.label)}>
      {section.tabs.filter((tab) => !isPersonal || !tab.clinicalOnly).map((tab) => (
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
