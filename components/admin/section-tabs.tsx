"use client";

import { useEffect, useState } from "react";
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

  /**
   * Quantos vídeos estão esperando, no rótulo da própria aba.
   *
   * O Bruno: *"quando eu vou para a página dos vídeos, eu preciso ter
   * notificação ali, pelo menos do lado, que tem vídeos que chegou."* O
   * contador vermelho do menu diz que há algo em Pacientes — e Pacientes tem
   * sete abas. Saber **qual** delas exige abrir as sete.
   */
  const [videosEsperando, setVideosEsperando] = useState(0);
  useEffect(() => {
    let vivo = true;
    const buscar = () =>
      fetch("/api/admin/pending-count")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (vivo && d?.unreviewedSubmissions !== undefined) setVideosEsperando(d.unreviewedSubmissions);
        })
        .catch(() => {});
    void buscar();
    // O mesmo ritmo do contador do menu: é pergunta barata e a resposta muda
    // quando um paciente grava, não quando alguém recarrega a página.
    const t = setInterval(buscar, 60_000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, []);

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
            {tab.key === "submissions" && videosEsperando > 0 && (
              <span className="section-tab-badge" aria-label={`${videosEsperando} waiting`}>
                {videosEsperando > 9 ? "9+" : videosEsperando}
              </span>
            )}
          </Link>
        ))}
    </div>
  );
}
