// lib/admin-sections.ts
import {
  Calendar,
  Users,
  Stethoscope,
  Megaphone,
  DollarSign,
  Settings,
  BellRing,
  type LucideIcon,
} from "lucide-react";

export interface AdminTab {
  key: string;
  label: string;
  labelPt: string;
  href: string;
  matchRoutes?: string[];
}

export interface AdminSection {
  key: string;
  label: string;
  labelPt: string;
  icon: LucideIcon;
  tabs: AdminTab[];
  matchRoutes?: string[];
}

export const ADMIN_SECTIONS: AdminSection[] = [
  {
    key: "agenda",
    label: "Schedule",
    labelPt: "Agenda",
    icon: Calendar,
    tabs: [
      {
        key: "today",
        label: "Today",
        labelPt: "Hoje",
        href: "/admin",
        matchRoutes: ["/admin"],
      },
      {
        key: "week",
        label: "Week",
        labelPt: "Semana",
        href: "/admin/appointments",
        matchRoutes: ["/admin/appointments"],
      },
      {
        key: "calendar",
        label: "Calendar",
        labelPt: "Calendario",
        href: "/admin/appointments?view=calendar",
      },
      {
        key: "availability",
        label: "Availability",
        labelPt: "Disponibilidade",
        href: "/admin/appointments/availability",
      },
      {
        key: "waitlist",
        label: "Waitlist",
        labelPt: "Lista de Espera",
        href: "/admin/waitlist",
      },
    ],
    matchRoutes: [
      "/admin",
      "/admin/appointments",
      "/admin/video-consultations",
      "/admin/calls",
      "/admin/waitlist",
    ],
  },
  {
    key: "patients",
    label: "Patients",
    labelPt: "Pacientes",
    icon: Users,
    tabs: [
      {
        key: "list",
        label: "List",
        labelPt: "Lista",
        href: "/admin/patients",
        matchRoutes: ["/admin/patients"],
      },
      {
        key: "screening",
        label: "Screening",
        labelPt: "Triagem",
        href: "/admin/screening-preview",
      },
      {
        key: "tasks",
        label: "Tasks",
        labelPt: "Tarefas",
        href: "/admin/patient-tasks",
      },
      {
        key: "portal",
        label: "Portal",
        labelPt: "Portal",
        href: "/admin/patient-portal",
        matchRoutes: [
          "/admin/patient-portal",
          "/admin/journey",
          "/admin/conditions",
          "/admin/quizzes",
          "/admin/achievements",
        ],
      },
    ],
    matchRoutes: [
      "/admin/patients",
      "/admin/screening-preview",
      "/admin/patient-tasks",
      "/admin/patient-portal",
      "/admin/journey",
      "/admin/conditions",
      "/admin/quizzes",
      "/admin/achievements",
    ],
  },
  {
    key: "notifications",
    label: "Notifications",
    labelPt: "Notificacoes",
    icon: BellRing,
    tabs: [
      {
        key: "broadcast",
        label: "Broadcast",
        labelPt: "Avisos Gerais",
        href: "/admin/notifications",
        matchRoutes: ["/admin/notifications"],
      },
    ],
    matchRoutes: ["/admin/notifications"],
  },
  {
    key: "clinical",
    label: "Clinical",
    labelPt: "Clinico",
    icon: Stethoscope,
    tabs: [
      {
        key: "notes",
        label: "SOAP Notes",
        labelPt: "Notas SOAP",
        href: "/admin/clinical-notes",
      },
      {
        key: "treatments",
        label: "Treatments",
        labelPt: "Tratamentos",
        href: "/admin/treatment-plans",
        matchRoutes: ["/admin/treatment-plans", "/admin/treatment-types"],
      },
      {
        key: "exercises",
        label: "Exercises",
        labelPt: "Exercicios",
        href: "/admin/exercises",
      },
      {
        key: "protocols",
        label: "Protocols",
        labelPt: "Protocolos",
        href: "/admin/protocols",
        matchRoutes: ["/admin/protocols"],
      },
      {
        key: "rehab-agent",
        label: "Rehab Agent",
        labelPt: "Agente Rehab",
        href: "/admin/clinical/rehab",
      },
    ],
    matchRoutes: [
      "/admin/clinical-notes",
      "/admin/clinical-ai",
      "/admin/treatment-plans",
      "/admin/treatment-types",
      "/admin/exercises",
      "/admin/protocols",
      "/admin/clinical/rehab",
    ],
  },
  {
    key: "marketing",
    label: "Marketing",
    labelPt: "Marketing",
    icon: Megaphone,
    tabs: [
      {
        key: "instagram",
        label: "Instagram",
        labelPt: "Instagram",
        href: "/admin/marketing/instagram",
        matchRoutes: [
          "/admin/marketing/instagram",
          "/admin/marketing/instagram-studio",
          "/admin/marketing/instagram-dashboard",
          "/admin/marketing/instagram-connect",
        ],
      },
      {
        key: "articles",
        label: "Articles",
        labelPt: "Artigos",
        href: "/admin/articles",
        matchRoutes: ["/admin/articles", "/admin/marketing/articles"],
      },
      {
        key: "calendar",
        label: "Calendar",
        labelPt: "Calendario",
        href: "/admin/marketing/content-calendar",
      },
      {
        key: "email",
        label: "Email",
        labelPt: "Email",
        href: "/admin/email",
        matchRoutes: [
          "/admin/email",
          "/admin/email-templates",
          "/admin/email-marketing",
        ],
      },
      {
        key: "education",
        label: "Education",
        labelPt: "Educacao",
        href: "/admin/education",
        matchRoutes: ["/admin/education"],
      },
      {
        key: "materials",
        label: "Materials",
        labelPt: "Materiais",
        href: "/admin/marketing",
        matchRoutes: [
          "/admin/marketing/flyers",
          "/admin/marketing/business-cards",
          "/admin/marketing/ebooks",
          "/admin/marketing/feedback",
        ],
      },
    ],
    matchRoutes: [
      "/admin/marketing",
      "/admin/articles",
      "/admin/email",
      "/admin/email-templates",
      "/admin/email-marketing",
      "/admin/education",
      "/admin/social",
      "/admin/sales",
    ],
  },
  {
    key: "finance",
    label: "Finance",
    labelPt: "Financeiro",
    icon: DollarSign,
    tabs: [
      {
        key: "overview",
        label: "Overview",
        labelPt: "Resumo",
        href: "/admin/finance",
      },
      {
        key: "pricing",
        label: "Pricing",
        labelPt: "Precos",
        href: "/admin/service-pricing",
      },
      {
        key: "memberships",
        label: "Memberships",
        labelPt: "Memberships",
        href: "/admin/memberships",
      },
      {
        key: "marketplace",
        label: "Marketplace",
        labelPt: "Marketplace",
        href: "/admin/marketplace",
        matchRoutes: ["/admin/marketplace"],
      },
    ],
    matchRoutes: [
      "/admin/finance",
      "/admin/service-pricing",
      "/admin/memberships",
      "/admin/marketplace",
      "/admin/stripe-branding",
      "/admin/cancellations",
    ],
  },
  {
    key: "settings",
    label: "Settings",
    labelPt: "Config",
    icon: Settings,
    tabs: [
      {
        key: "general",
        label: "General",
        labelPt: "Geral",
        href: "/admin/settings",
        matchRoutes: ["/admin/settings", "/admin/service-pages"],
      },
      {
        key: "users",
        label: "Users",
        labelPt: "Usuarios",
        href: "/admin/users",
      },
      {
        key: "clinics",
        label: "Clinics",
        labelPt: "Clinicas",
        href: "/admin/clinics",
      },
      {
        key: "ai",
        label: "AI",
        labelPt: "AI",
        href: "/admin/ai-settings",
        matchRoutes: ["/admin/ai-settings", "/admin/ai-coworker"],
      },
      {
        key: "security",
        label: "Security",
        labelPt: "Seguranca",
        href: "/admin/security",
        matchRoutes: ["/admin/security", "/admin/agent-keys"],
      },
      {
        key: "logs",
        label: "Logs",
        labelPt: "Logs",
        href: "/admin/system-logs",
        matchRoutes: [
          "/admin/system-logs",
          "/admin/voice-costs",
          "/admin/analytics",
        ],
      },
    ],
    matchRoutes: [
      "/admin/settings",
      "/admin/users",
      "/admin/clinics",
      "/admin/ai-settings",
      "/admin/ai-coworker",
      "/admin/security",
      "/admin/agent-keys",
      "/admin/system-logs",
      "/admin/voice-costs",
      "/admin/analytics",
      "/admin/service-pages",
    ],
  },
];

/**
 * Matches a route against a pattern.
 * "/admin" only matches exactly "/admin" (not "/admin/patients").
 * All other routes match as prefix (e.g. "/admin/patients" matches "/admin/patients/123").
 */
function routeMatches(pathname: string, route: string): boolean {
  // Exact "/admin" should only match the root dashboard, not all admin routes
  if (route === "/admin") {
    return pathname === "/admin";
  }
  const routePath = route.split("?")[0];
  return pathname === routePath || pathname.startsWith(routePath + "/");
}

export function getActiveAdminNav(pathname: string): {
  section: AdminSection;
  tab: AdminTab | null;
} | null {
  const clean = pathname.replace(/\/$/, "") || "/admin";

  // Try to find a matching section (skip agenda first, check specific sections)
  // Iterate in reverse so more specific sections are checked before generic ones
  for (const section of [...ADMIN_SECTIONS].reverse()) {
    // Skip agenda (fallback) on first pass
    if (section.key === "agenda" && clean !== "/admin") continue;

    const sectionMatch = section.matchRoutes?.some((r) => routeMatches(clean, r));
    if (!sectionMatch) continue;

    let matchedTab: AdminTab | null = null;
    for (const tab of section.tabs) {
      const tabRoutes = [tab.href, ...(tab.matchRoutes || [])];
      const tabMatch = tabRoutes.some((r) => routeMatches(clean, r));
      if (tabMatch) {
        matchedTab = tab;
        break;
      }
    }

    return { section, tab: matchedTab || section.tabs[0] };
  }

  // Fallback: agenda (dashboard)
  return { section: ADMIN_SECTIONS[0], tab: ADMIN_SECTIONS[0].tabs[0] };
}
