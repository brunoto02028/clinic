# Clinic Layout Redesign - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reestruturar a navegacao dos paineis admin (mini-sidebar + tabs) e paciente (sidebar fixa com labels), reorganizando 60+ paginas em 6 secoes claras por painel.

**Architecture:** A reorganizacao e puramente visual/navegacao. Rotas do Next.js App Router permanecem inalteradas. Novos componentes de sidebar substituem os atuais, e um sistema de mapeamento URL→secao→tab determina o estado ativo da navegacao. Os componentes antigos (AdminSidebar, DashboardLayout sidebar) sao substituidos inline.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Radix UI Tabs (@radix-ui/react-tabs 1.1.0), Lucide React icons, next-auth 4.24.11

**Design Spec:** `docs/superpowers/specs/2026-06-24-clinic-layout-redesign-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `lib/admin-sections.ts` | Definicao das 6 secoes do admin com tabs e mapeamento URL→secao→tab |
| Create | `components/admin/admin-mini-sidebar.tsx` | Nova mini-sidebar do admin com expand-on-hover |
| Create | `components/admin/section-tabs.tsx` | Tabs contextuais que mudam por secao ativa |
| Create | `lib/patient-sections.ts` | Definicao das 6 secoes do paciente com mapeamento URL |
| Create | `components/dashboard/patient-sidebar.tsx` | Nova sidebar fixa do paciente com labels |
| Modify | `app/admin/layout.tsx` | Trocar AdminSidebar por AdminMiniSidebar + SectionTabs |
| Modify | `components/dashboard/dashboard-layout.tsx` | Trocar sidebar interna por PatientSidebar |
| Modify | `app/globals.css` | Novos estilos para mini-sidebar e patient-sidebar |
| Keep | `components/admin/admin-sidebar.tsx` | Manter temporariamente como referencia (remover ao final) |
| Keep | `lib/module-registry.ts` | Sem alteracao, usado pelo PatientSidebar |

---

### Task 1: Criar o mapeamento de secoes do admin

**Files:**
- Create: `lib/admin-sections.ts`

- [ ] **Step 1: Criar o arquivo de configuracao das secoes**

```typescript
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
  /** Additional routes that should highlight this tab */
  matchRoutes?: string[];
}

export interface AdminSection {
  key: string;
  label: string;
  labelPt: string;
  icon: LucideIcon;
  tabs: AdminTab[];
  /** Routes that belong to this section (used for sidebar active state) */
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

/**
 * Find the active section and tab based on the current pathname.
 * Matches against section.matchRoutes and tab.matchRoutes/href.
 * Returns null if no match (e.g. on a page not in any section).
 */
export function getActiveAdminNav(pathname: string): {
  section: AdminSection;
  tab: AdminTab | null;
} | null {
  // Strip search params and trailing slash
  const clean = pathname.replace(/\/$/, "") || "/admin";

  for (const section of ADMIN_SECTIONS) {
    const sectionMatch = section.matchRoutes?.some(
      (r) => clean === r || clean.startsWith(r + "/")
    );
    if (!sectionMatch) continue;

    // Find matching tab
    let matchedTab: AdminTab | null = null;
    for (const tab of section.tabs) {
      const tabRoutes = [tab.href, ...(tab.matchRoutes || [])];
      const tabMatch = tabRoutes.some(
        (r) => {
          const routePath = r.split("?")[0];
          return clean === routePath || clean.startsWith(routePath + "/");
        }
      );
      if (tabMatch) {
        matchedTab = tab;
        break;
      }
    }

    return { section, tab: matchedTab || section.tabs[0] };
  }

  // Default: first section (agenda/dashboard)
  return { section: ADMIN_SECTIONS[0], tab: ADMIN_SECTIONS[0].tabs[0] };
}
```

- [ ] **Step 2: Verificar que o TypeScript compila**

Run: `cd /c/Users/kaiop/orca/workspaces/Clinica/Feat-New-Layout && npx tsc --noEmit lib/admin-sections.ts --skipLibCheck --esModuleInterop --jsx react-jsx --moduleResolution bundler --module esnext --target esnext`
Expected: No errors (or run `npx next lint lib/admin-sections.ts`)

- [ ] **Step 3: Commit**

```bash
git add lib/admin-sections.ts
git commit -m "feat: add admin section/tab mapping config"
```

---

### Task 2: Criar estilos CSS para a nova navegacao

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Adicionar estilos da mini-sidebar do admin e sidebar do paciente**

Adicionar ao final de `app/globals.css` (antes de qualquer `@media` query existente):

```css
/* ========================================
   REDESIGN: Admin Mini-Sidebar
   ======================================== */
.admin-mini-sidebar {
  width: 60px;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 8px;
  background: linear-gradient(180deg, hsl(200 40% 6% / 0.97), hsl(200 35% 8% / 0.97));
  backdrop-filter: blur(20px);
  border-right: 1px solid hsl(195 30% 20% / 0.3);
  transition: width 0.2s ease;
}

.admin-mini-sidebar:hover {
  width: 200px;
}

/* Overlay: sidebar expands OVER content, no layout shift */
.admin-mini-sidebar:hover ~ .admin-content-area {
  /* No padding change - sidebar overlays */
}

.admin-mini-sidebar .nav-icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease, box-shadow 0.15s ease;
  position: relative;
  flex-shrink: 0;
}

.admin-mini-sidebar:hover .nav-icon-btn {
  width: 100%;
  height: auto;
  padding: 10px 14px;
  justify-content: flex-start;
  gap: 12px;
}

.admin-mini-sidebar .nav-icon-btn.active {
  background: hsl(195 30% 42% / 0.15);
  box-shadow: inset 0 0 12px hsl(195 30% 42% / 0.1);
}

.admin-mini-sidebar .nav-icon-btn:not(.active):hover {
  background: hsl(195 20% 90% / 0.05);
}

.admin-mini-sidebar .nav-label {
  display: none;
  font-size: 13px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.admin-mini-sidebar:hover .nav-label {
  display: inline;
  opacity: 1;
}

/* ========================================
   REDESIGN: Admin Section Tabs
   ======================================== */
.section-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid hsl(195 20% 90% / 0.08);
  margin-bottom: 20px;
  overflow-x: auto;
  scrollbar-width: none;
}

.section-tabs::-webkit-scrollbar {
  display: none;
}

.section-tab {
  padding: 10px 18px;
  font-size: 13px;
  color: hsl(195 20% 90% / 0.45);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.15s ease, border-color 0.15s ease;
  white-space: nowrap;
  text-decoration: none;
}

.section-tab:hover {
  color: hsl(195 20% 90% / 0.7);
}

.section-tab.active {
  color: hsl(174 56% 57%);
  border-bottom-color: hsl(174 56% 57%);
}

/* ========================================
   REDESIGN: Patient Sidebar (fixed, always shows labels)
   ======================================== */
.patient-sidebar {
  width: 200px;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  padding: 16px 12px;
  background: linear-gradient(180deg, hsl(200 40% 6% / 0.97), hsl(200 35% 8% / 0.97));
  backdrop-filter: blur(20px);
  border-right: 1px solid hsl(195 30% 20% / 0.3);
}

.patient-sidebar .patient-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border-radius: 10px;
  margin-bottom: 2px;
  cursor: pointer;
  transition: background 0.15s ease;
  font-size: 13px;
  color: hsl(195 20% 90% / 0.6);
  text-decoration: none;
}

.patient-sidebar .patient-nav-item:hover {
  background: hsl(195 20% 90% / 0.04);
  color: hsl(195 20% 90% / 0.8);
}

.patient-sidebar .patient-nav-item.active {
  background: hsl(174 56% 57% / 0.12);
  color: hsl(174 56% 57%);
  font-weight: 600;
}

/* ========================================
   REDESIGN: Content area offsets
   ======================================== */
.admin-content-area {
  padding-left: 60px;
  min-height: 100vh;
}

.patient-content-area {
  padding-left: 200px;
  min-height: 100vh;
}

/* ========================================
   REDESIGN: Mobile responsive
   ======================================== */
@media (max-width: 1023px) {
  .admin-mini-sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    width: 200px;
  }

  .admin-mini-sidebar.mobile-open {
    transform: translateX(0);
  }

  .admin-mini-sidebar .nav-label {
    display: inline;
    opacity: 1;
  }

  .admin-content-area {
    padding-left: 0;
  }

  .patient-sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }

  .patient-sidebar.mobile-open {
    transform: translateX(0);
  }

  .patient-content-area {
    padding-left: 0;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/globals.css
git commit -m "feat: add CSS for admin mini-sidebar and patient sidebar"
```

---

### Task 3: Criar o componente AdminMiniSidebar

**Files:**
- Create: `components/admin/admin-mini-sidebar.tsx`

- [ ] **Step 1: Criar o componente**

```typescript
// components/admin/admin-mini-sidebar.tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Menu, X, Bell } from "lucide-react";
import { ADMIN_SECTIONS, getActiveAdminNav, type AdminSection } from "@/lib/admin-sections";
import LocaleToggle from "@/components/locale-toggle";

interface AdminMiniSidebarProps {
  user: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    role?: string;
    clinicId?: string;
    clinicName?: string;
    permissions?: Record<string, boolean>;
  };
}

export default function AdminMiniSidebar({ user }: AdminMiniSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const activeNav = getActiveAdminNav(pathname);
  const isSuperAdmin = user.role === "SUPERADMIN";

  // Load clinic logo
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.screenLogos?.adminLogin) setLogoUrl(data.screenLogos.adminLogin);
        else if (data?.logoUrl) setLogoUrl(data.logoUrl);
      })
      .catch(() => {});
  }, []);

  const initials = [user.firstName?.[0], user.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "?";

  const handleSectionClick = (section: AdminSection) => {
    const defaultHref = section.tabs[0]?.href || "/admin";
    router.push(defaultHref);
    setMobileOpen(false);
  };

  // Filter sections based on role
  const visibleSections = ADMIN_SECTIONS.filter((section) => {
    // Settings: clinics tab only for SUPERADMIN, but section visible to all admins
    return true;
  });

  // Separate settings from main nav
  const mainSections = visibleSections.filter((s) => s.key !== "settings");
  const settingsSection = visibleSections.find((s) => s.key === "settings");

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="fixed top-3 left-3 z-50 lg:hidden p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border/30"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav
        className={`admin-mini-sidebar ${mobileOpen ? "mobile-open" : ""}`}
        aria-label="Admin navigation"
      >
        {/* Logo */}
        <div className="mb-6 flex-shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-content-center text-primary text-xs font-bold">
              {user.clinicName?.[0] || "C"}
            </div>
          )}
        </div>

        {/* Main sections */}
        <div className="flex flex-col gap-1 flex-1">
          {mainSections.map((section) => {
            const Icon = section.icon;
            const isActive = activeNav?.section.key === section.key;

            return (
              <button
                key={section.key}
                className={`nav-icon-btn ${isActive ? "active" : ""}`}
                onClick={() => handleSectionClick(section)}
                title={section.labelPt}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={20} className={isActive ? "text-primary" : "text-muted-foreground"} />
                <span className={`nav-label ${isActive ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                  {section.labelPt}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom area: settings + user */}
        <div className="flex flex-col gap-1 mt-auto pt-4 border-t border-border/10">
          {settingsSection && (
            <button
              className={`nav-icon-btn ${activeNav?.section.key === "settings" ? "active" : ""}`}
              onClick={() => handleSectionClick(settingsSection)}
              title={settingsSection.labelPt}
            >
              <settingsSection.icon
                size={20}
                className={activeNav?.section.key === "settings" ? "text-primary" : "text-muted-foreground"}
              />
              <span className={`nav-label ${activeNav?.section.key === "settings" ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                {settingsSection.labelPt}
              </span>
            </button>
          )}

          {/* User avatar + sign out */}
          <div className="nav-icon-btn" title={user.email || ""}>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold flex-shrink-0">
              {initials}
            </div>
            <div className="nav-label flex flex-col overflow-hidden">
              <span className="text-xs text-foreground truncate">
                {user.firstName} {user.lastName}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-xs text-muted-foreground hover:text-destructive text-left"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
```

- [ ] **Step 2: Verificar compilacao**

Run: `cd /c/Users/kaiop/orca/workspaces/Clinica/Feat-New-Layout && npx tsc --noEmit --skipLibCheck`
Expected: No type errors related to admin-mini-sidebar

- [ ] **Step 3: Commit**

```bash
git add components/admin/admin-mini-sidebar.tsx
git commit -m "feat: add AdminMiniSidebar component"
```

---

### Task 4: Criar o componente SectionTabs

**Files:**
- Create: `components/admin/section-tabs.tsx`

- [ ] **Step 1: Criar o componente de tabs contextuais**

```typescript
// components/admin/section-tabs.tsx
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
```

- [ ] **Step 2: Verificar compilacao**

Run: `cd /c/Users/kaiop/orca/workspaces/Clinica/Feat-New-Layout && npx tsc --noEmit --skipLibCheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add components/admin/section-tabs.tsx
git commit -m "feat: add SectionTabs component for admin"
```

---

### Task 5: Integrar nova navegacao no layout do admin

**Files:**
- Modify: `app/admin/layout.tsx` (33 lines)

- [ ] **Step 1: Ler o arquivo atual**

Read: `app/admin/layout.tsx`

- [ ] **Step 2: Substituir o layout para usar AdminMiniSidebar + SectionTabs**

Substituir o conteudo completo de `app/admin/layout.tsx` por:

```typescript
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import AdminMiniSidebar from "@/components/admin/admin-mini-sidebar";
import SectionTabs from "@/components/admin/section-tabs";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userRole = (session.user as any)?.role;
  if (!userRole || userRole === "PATIENT") {
    redirect("/dashboard");
  }

  const user = {
    firstName: (session.user as any)?.firstName || session.user?.name?.split(" ")[0],
    lastName: (session.user as any)?.lastName || session.user?.name?.split(" ").slice(1).join(" "),
    email: session.user?.email,
    role: userRole,
    clinicId: (session.user as any)?.clinicId,
    clinicName: (session.user as any)?.clinicName,
    permissions: (session.user as any)?.permissions,
  };

  return (
    <div className="min-h-screen bg-background bg-grid-pattern">
      <AdminMiniSidebar user={user} />
      <main className="admin-content-area py-6 px-4 sm:px-6 lg:px-8 pb-8">
        {/* Mobile spacer for hamburger button */}
        <div className="h-10 lg:hidden" />
        <SectionTabs />
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Verificar que o build funciona**

Run: `cd /c/Users/kaiop/orca/workspaces/Clinica/Feat-New-Layout && npx next build --no-lint 2>&1 | head -30`
Expected: Build starts without import errors. (Full build may take long, Ctrl+C after confirming no errors in first 30 lines.)

Alternative quick check: `npx tsc --noEmit --skipLibCheck`

- [ ] **Step 4: Commit**

```bash
git add app/admin/layout.tsx
git commit -m "feat: replace admin sidebar with mini-sidebar + section tabs"
```

---

### Task 6: Criar o mapeamento de secoes do paciente

**Files:**
- Create: `lib/patient-sections.ts`

- [ ] **Step 1: Criar o arquivo de configuracao**

```typescript
// lib/patient-sections.ts
import {
  Home,
  Calendar,
  Stethoscope,
  Dumbbell,
  BookOpen,
  User,
  type LucideIcon,
} from "lucide-react";

export interface PatientSection {
  key: string;
  label: string;
  labelPt: string;
  icon: LucideIcon;
  href: string;
  /** Additional routes that belong to this section */
  matchRoutes: string[];
}

export const PATIENT_SECTIONS: PatientSection[] = [
  {
    key: "home",
    label: "Home",
    labelPt: "Inicio",
    icon: Home,
    href: "/dashboard",
    matchRoutes: ["/dashboard"],
  },
  {
    key: "appointments",
    label: "Appointments",
    labelPt: "Consultas",
    icon: Calendar,
    href: "/dashboard/appointments",
    matchRoutes: [
      "/dashboard/appointments",
      "/dashboard/screening",
      "/dashboard/consent",
      "/dashboard/assessment-flow",
    ],
  },
  {
    key: "health",
    label: "My Health",
    labelPt: "Minha Saude",
    icon: Stethoscope,
    href: "/dashboard/clinical-notes",
    matchRoutes: [
      "/dashboard/clinical-notes",
      "/dashboard/scans",
      "/dashboard/body-assessments",
      "/dashboard/treatment",
      "/dashboard/plans",
      "/dashboard/blood-pressure",
      "/dashboard/biohacking",
      "/dashboard/documents",
      "/dashboard/records",
      "/dashboard/outcome-measures",
      "/dashboard/follow-up",
    ],
  },
  {
    key: "exercises",
    label: "Exercises",
    labelPt: "Exercicios",
    icon: Dumbbell,
    href: "/dashboard/exercises",
    matchRoutes: [
      "/dashboard/exercises",
      "/dashboard/tasks",
      "/dashboard/journey",
      "/dashboard/achievements",
      "/dashboard/quizzes",
      "/dashboard/quiz",
    ],
  },
  {
    key: "learn",
    label: "Learn",
    labelPt: "Aprender",
    icon: BookOpen,
    href: "/dashboard/education",
    matchRoutes: [
      "/dashboard/education",
      "/dashboard/guide",
      "/dashboard/insole-guide",
      "/dashboard/community",
    ],
  },
];

export const PATIENT_PROFILE_SECTION: PatientSection = {
  key: "profile",
  label: "My Profile",
  labelPt: "Meu Perfil",
  icon: User,
  href: "/dashboard/profile",
  matchRoutes: [
    "/dashboard/profile",
    "/dashboard/membership",
    "/dashboard/marketplace",
    "/dashboard/recordings",
  ],
};

/**
 * Find the active section based on current pathname.
 * Exact match on /dashboard returns "home".
 * Otherwise matches the most specific route.
 */
export function getActivePatientSection(pathname: string): PatientSection {
  const clean = pathname.replace(/\/$/, "") || "/dashboard";

  // Exact match for home
  if (clean === "/dashboard") {
    return PATIENT_SECTIONS[0];
  }

  // Check profile section
  if (PATIENT_PROFILE_SECTION.matchRoutes.some(
    (r) => clean === r || clean.startsWith(r + "/")
  )) {
    return PATIENT_PROFILE_SECTION;
  }

  // Check main sections (skip home, check in reverse for most specific match)
  for (const section of [...PATIENT_SECTIONS].reverse()) {
    if (section.key === "home") continue;
    if (section.matchRoutes.some(
      (r) => clean === r || clean.startsWith(r + "/")
    )) {
      return section;
    }
  }

  return PATIENT_SECTIONS[0]; // Default: home
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/patient-sections.ts
git commit -m "feat: add patient section mapping config"
```

---

### Task 7: Criar o componente PatientSidebar

**Files:**
- Create: `components/dashboard/patient-sidebar.tsx`

- [ ] **Step 1: Criar o componente**

```typescript
// components/dashboard/patient-sidebar.tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LogOut, Menu, X, Bell } from "lucide-react";
import {
  PATIENT_SECTIONS,
  PATIENT_PROFILE_SECTION,
  getActivePatientSection,
} from "@/lib/patient-sections";

interface PatientSidebarProps {
  notifications?: number;
}

export default function PatientSidebar({ notifications = 0 }: PatientSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const activeSection = getActivePatientSection(pathname);

  const user = session?.user as any;
  const firstName = user?.firstName || user?.name?.split(" ")[0] || "";
  const lastName = user?.lastName || "";

  // Load clinic logo
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.darkLogoUrl) setLogoUrl(data.darkLogoUrl);
        else if (data?.logoUrl) setLogoUrl(data.logoUrl);
      })
      .catch(() => {});
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed top-3 left-3 z-50 lg:hidden p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border/30"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile notification bell */}
      <div className="fixed top-3 right-3 z-50 lg:hidden">
        <Link href="/dashboard" className="relative p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border/30 inline-flex">
          <Bell size={20} />
          {notifications > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-bold">
              {notifications > 9 ? "9+" : notifications}
            </span>
          )}
        </Link>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav
        className={`patient-sidebar ${mobileOpen ? "mobile-open" : ""}`}
        aria-label="Patient navigation"
      >
        {/* Logo + user name */}
        <div className="px-3 mb-6">
          <div className="flex items-center gap-2 mb-1">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-6 h-6 object-contain" />
            ) : (
              <span className="text-primary font-bold text-sm">🏥</span>
            )}
            <span className="text-primary font-bold text-sm">CLINICA</span>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {firstName} {lastName}
          </p>
        </div>

        {/* Main nav items */}
        <div className="flex flex-col flex-1">
          {PATIENT_SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection.key === section.key;

            return (
              <Link
                key={section.key}
                href={section.href}
                className={`patient-nav-item ${isActive ? "active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={20} />
                <span>{section.labelPt}</span>
              </Link>
            );
          })}
        </div>

        {/* Bottom: profile + sign out */}
        <div className="border-t border-border/10 pt-3 mt-auto">
          <Link
            href={PATIENT_PROFILE_SECTION.href}
            className={`patient-nav-item ${activeSection.key === "profile" ? "active" : ""}`}
          >
            <PATIENT_PROFILE_SECTION.icon size={20} />
            <span>{PATIENT_PROFILE_SECTION.labelPt}</span>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="patient-nav-item w-full text-muted-foreground/50 hover:text-destructive"
          >
            <LogOut size={18} />
            <span className="text-xs">Sair</span>
          </button>
        </div>
      </nav>
    </>
  );
}
```

- [ ] **Step 2: Verificar compilacao**

Run: `cd /c/Users/kaiop/orca/workspaces/Clinica/Feat-New-Layout && npx tsc --noEmit --skipLibCheck`

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/patient-sidebar.tsx
git commit -m "feat: add PatientSidebar component with fixed labels"
```

---

### Task 8: Integrar PatientSidebar no dashboard layout

**Files:**
- Modify: `components/dashboard/dashboard-layout.tsx` (609 lines)

Esta e a tarefa mais delicada. O `dashboard-layout.tsx` atual tem 609 linhas com muita logica: module access control, consent gate, impersonation, notifications, BPR Journey, pull-to-refresh, mobile nav, etc. Vamos preservar TODA a logica e substituir apenas a sidebar visual.

- [ ] **Step 1: Ler o arquivo completo**

Read: `components/dashboard/dashboard-layout.tsx` (completo, 609 linhas)

Identificar:
- Onde a sidebar JSX comeca e termina (procurar a `<nav` ou `<aside` que contem os nav items)
- Onde o mobile bottom nav esta
- O padding-left do conteudo principal

- [ ] **Step 2: Importar PatientSidebar e remover sidebar inline**

No topo do arquivo, adicionar import:

```typescript
import PatientSidebar from "@/components/dashboard/patient-sidebar";
```

- [ ] **Step 3: Substituir a sidebar JSX inline pelo componente PatientSidebar**

Localizar o bloco JSX da sidebar desktop (a `<nav>` ou `<aside>` com `sidebar-futuristic` class que renderiza os nav items). Substituir por:

```tsx
<PatientSidebar notifications={notifCount} />
```

- [ ] **Step 4: Atualizar o padding do conteudo principal**

Trocar `lg:pl-64` (ou o padding-left existente do conteudo) por `patient-content-area`:

```tsx
<div className="patient-content-area bg-background bg-grid-pattern min-h-screen">
```

Em mobile (< lg), o `patient-content-area` ja nao tem padding (CSS cuida disso).

- [ ] **Step 5: Remover o mobile bottom nav inline**

O `dashboard-layout.tsx` tem uma `mobile-nav-futuristic` no rodape para mobile. Remover esse bloco inteiro, pois o PatientSidebar ja tem hamburger menu para mobile.

- [ ] **Step 6: Manter toda a logica de negocio intacta**

Verificar que estes recursos continuam funcionando:
- `usePatientAccess()` hook e ModuleGate
- Consent gate (redirect para /dashboard/consent)
- Impersonation banner
- Notifications fetch e estado
- Pull-to-refresh
- Locale sync
- Portal config loading
- BPR Journey section (pode ser movido para dentro das paginas de exercicios futuramente)

- [ ] **Step 7: Verificar compilacao e build**

Run: `cd /c/Users/kaiop/orca/workspaces/Clinica/Feat-New-Layout && npx tsc --noEmit --skipLibCheck`

Se houver erros, corrigir imports e tipos.

- [ ] **Step 8: Commit**

```bash
git add components/dashboard/dashboard-layout.tsx
git commit -m "feat: replace patient dashboard sidebar with PatientSidebar"
```

---

### Task 9: Limpeza e verificacao final

**Files:**
- Review: All modified files

- [ ] **Step 1: Verificar build completo**

Run: `cd /c/Users/kaiop/orca/workspaces/Clinica/Feat-New-Layout && npx next build --no-lint`

Expected: Build succeeds without errors. Se houver warnings, avaliar se sao pre-existentes ou novos.

- [ ] **Step 2: Testar navegacao admin visualmente**

Start: `npx next dev`

Verificar no browser:
1. Mini-sidebar aparece com 6 icones
2. Hover expande mostrando labels
3. Clicar em cada secao navega para a pagina correta
4. Tabs contextuais mudam por secao
5. Tab ativa corresponde a pagina atual
6. Mobile: hamburger abre drawer com labels
7. User avatar e sign out funcionam

- [ ] **Step 3: Testar navegacao paciente visualmente**

Verificar no browser (logado como paciente ou impersonating):
1. Sidebar fixa com icone + texto sempre visiveis
2. 5 secoes + Perfil no rodape
3. Active state correto ao navegar
4. Mobile: hamburger abre sidebar
5. Notificacoes com badge
6. Sign out funciona
7. Consent gate ainda funciona (se aplicavel)

- [ ] **Step 4: Renomear o antigo AdminSidebar**

Renomear `components/admin/admin-sidebar.tsx` para `components/admin/admin-sidebar.old.tsx` para referencia. Nao deletar ainda ate confirmar que tudo funciona em producao.

```bash
git mv components/admin/admin-sidebar.tsx components/admin/admin-sidebar.old.tsx
```

- [ ] **Step 5: Commit final**

```bash
git add -A
git commit -m "feat: complete layout redesign - admin mini-sidebar + patient fixed sidebar"
```

---

## Items Deferidos (follow-up tasks)

Estes items fazem parte da spec mas sao melhorias incrementais, nao bloqueiam o core do redesign:

1. **GlobalSearch (Cmd+K)** - Command palette para busca rapida de pacientes/funcoes. Novo componente usando `cmdk` (ja instalado). Implementar apos o layout estar estavel.
2. **Admin Header Bar** - Barra no topo da area de conteudo com: titulo da secao, busca, notificacoes, avatar, clinic selector (SUPERADMIN). Atualmente essas funcoes estavam na sidebar antiga. Implementar como componente separado.
3. **Clinic Selector para SUPERADMIN** - O AdminSidebar antigo tinha clinic selector. Mover para o Admin Header Bar ou para a mini-sidebar expandida.
4. **i18n toggle** - O LocaleToggle existia na sidebar antiga. Adicionar ao header ou sidebar expandida.
5. **Breadcrumbs em sub-paginas** - Spec menciona breadcrumbs ao navegar sub-paginas (ex: editar scan). Implementar como componente reutilizavel.

---

## Checklist de Verificacao Pos-Implementacao

- [ ] Admin: Mini-sidebar colapsada mostra 6 icones
- [ ] Admin: Hover expande sidebar com labels
- [ ] Admin: Tabs contextuais mudam por secao
- [ ] Admin: Todas as 60+ paginas acessiveis via secao + tab correta
- [ ] Admin: Permissoes de role (SuperAdmin, Admin, Therapist) funcionam
- [ ] Admin: Clinic selector funciona (se aplicavel)
- [ ] Admin: Mobile drawer abre/fecha
- [ ] Paciente: Sidebar fixa com 6 itens (icone + texto)
- [ ] Paciente: Active state correto
- [ ] Paciente: Module access control funciona
- [ ] Paciente: Consent gate funciona
- [ ] Paciente: Impersonation funciona
- [ ] Paciente: Mobile hamburger abre/fecha
- [ ] Tema: Cores mantidas (dark teal, neon cyan)
- [ ] i18n: Labels em PT-BR
- [ ] Build: `next build` sem erros
