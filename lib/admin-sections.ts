// lib/admin-sections.ts
import {
  Calendar,
  Users,
  Stethoscope,
  Megaphone,
  DollarSign,
  Settings,
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
    ],
    matchRoutes: [
      "/admin",
      "/admin/appointments",
      "/admin/video-consultations",
      "/admin/calls",
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
        key: "foot-scans",
        label: "Foot Scans",
        labelPt: "Foot Scans",
        href: "/admin/foot-scans",
        matchRoutes: ["/admin/foot-scans"],
      },
      {
        key: "body",
        label: "Body Assessment",
        labelPt: "Body Assessment",
        href: "/admin/body-assessments",
        matchRoutes: ["/admin/body-assessments", "/admin/body-models"],
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
        key: "biohacking",
        label: "Biohacking",
        labelPt: "Biohacking",
        href: "/admin/biohacking",
        matchRoutes: ["/admin/biohacking", "/admin/blood-pressure"],
      },
    ],
    matchRoutes: [
      "/admin/clinical-notes",
      "/admin/clinical-ai",
      "/admin/foot-scans",
      "/admin/body-assessments",
      "/admin/body-models",
      "/admin/treatment-plans",
      "/admin/treatment-types",
      "/admin/exercises",
      "/admin/biohacking",
      "/admin/blood-pressure",
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

export function getActiveAdminNav(pathname: string): {
  section: AdminSection;
  tab: AdminTab | null;
} | null {
  const clean = pathname.replace(/\/$/, "") || "/admin";

  for (const section of ADMIN_SECTIONS) {
    const sectionMatch = section.matchRoutes?.some(
      (r) => clean === r || clean.startsWith(r + "/")
    );
    if (!sectionMatch) continue;

    let matchedTab: AdminTab | null = null;
    for (const tab of section.tabs) {
      const tabRoutes = [tab.href, ...(tab.matchRoutes || [])];
      const tabMatch = tabRoutes.some((r) => {
        const routePath = r.split("?")[0];
        return clean === routePath || clean.startsWith(routePath + "/");
      });
      if (tabMatch) {
        matchedTab = tab;
        break;
      }
    }

    return { section, tab: matchedTab || section.tabs[0] };
  }

  return { section: ADMIN_SECTIONS[0], tab: ADMIN_SECTIONS[0].tabs[0] };
}
