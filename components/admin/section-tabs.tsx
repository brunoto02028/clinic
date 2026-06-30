"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getActiveAdminNav } from "@/lib/admin-sections";
import { useLocale } from "@/hooks/use-locale";

export default function SectionTabs() {
  const pathname = usePathname();
  const { locale } = useLocale();
  const activeNav = getActiveAdminNav(pathname);

  if (!activeNav) return null;

  const { section, tab: activeTab } = activeNav;
  const isPt = locale?.startsWith("pt");

  return (
    <div className="section-tabs" role="tablist" aria-label={isPt ? section.labelPt : section.label}>
      {section.tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`section-tab ${activeTab?.key === tab.key ? "active" : ""}`}
          role="tab"
          aria-selected={activeTab?.key === tab.key}
        >
          {isPt ? tab.labelPt : tab.label}
        </Link>
      ))}
    </div>
  );
}
