"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getActiveAdminNav } from "@/lib/admin-sections";

export default function SectionTabs() {
  const pathname = usePathname();
  const activeNav = getActiveAdminNav(pathname);

  if (!activeNav) return null;

  const { section, tab: activeTab } = activeNav;

  return (
    <div className="section-tabs" role="tablist" aria-label={section.labelPt}>
      {section.tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`section-tab ${activeTab?.key === tab.key ? "active" : ""}`}
          role="tab"
          aria-selected={activeTab?.key === tab.key}
        >
          {tab.labelPt}
        </Link>
      ))}
    </div>
  );
}
