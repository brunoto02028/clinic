// ============================================
// CENTRALIZED MODULE & PERMISSION REGISTRY
// Single source of truth for all patient-facing modules and permissions.
// Used by: Admin membership editor, patient dashboard sidebar,
//          access enforcement middleware, module gate component.
// ============================================

import {
  LayoutDashboard,
  Calendar,
  Footprints,
  Activity,
  FileText,
  Shield,
  GraduationCap,
  Dumbbell,
  Heart,
  FileUp,
  HeartPulse,
  CreditCard,
  Scale,
  User,
  Video,
  MessageSquare,
  BarChart3,
  Zap,
  Stethoscope,
  Star,
  ClipboardList,
  BookOpen,
  Trophy,
  Award,
  type LucideIcon,
} from "lucide-react";

// ─── Module Definitions ────────────────────────────────────
// Each module maps to a dashboard route the patient can access.

export interface ModuleDefinition {
  key: string;            // Unique key stored in MembershipPlan.features[]
  label: string;          // Display label (English)
  labelPt: string;        // Display label (Portuguese)
  description: string;    // Short explanation
  icon: LucideIcon;
  href: string;           // Dashboard route
  category: "core" | "clinical" | "wellness" | "content" | "admin_only";
  alwaysVisible?: boolean; // true = always shown in sidebar (dashboard, profile, plans, consent)
  defaultEnabled?: boolean; // true = enabled by default when creating a new plan
}

export const MODULE_REGISTRY: ModuleDefinition[] = [
  // ── CORE (always visible, cannot be disabled) ──
  {
    key: "mod_dashboard",
    label: "Dashboard",
    labelPt: "Painel",
    description: "Main dashboard overview",
    icon: LayoutDashboard,
    href: "/dashboard",
    category: "core",
    alwaysVisible: true,
    defaultEnabled: true,
  },
  {
    key: "mod_profile",
    label: "My Profile",
    labelPt: "Meu Perfil",
    description: "View and edit personal information",
    icon: User,
    href: "/dashboard/profile",
    category: "core",
    alwaysVisible: true,
    defaultEnabled: true,
  },
  {
    key: "mod_plans",
    label: "Plans & Membership",
    labelPt: "Planos & Assinatura",
    description: "View available plans and manage subscription",
    icon: CreditCard,
    href: "/dashboard/membership",
    category: "core",
    alwaysVisible: true,
    defaultEnabled: true,
  },
  {
    key: "mod_consent",
    label: "Terms & Consent",
    labelPt: "Termos e Consentimento",
    description: "Accept terms of use and privacy policy",
    icon: Scale,
    href: "/dashboard/consent",
    category: "core",
    alwaysVisible: true,
    defaultEnabled: true,
  },

  // ── CLINICAL (require plan access) ──
  {
    key: "mod_appointments",
    label: "Appointments",
    labelPt: "Consultas",
    description: "Book and manage appointments",
    icon: Calendar,
    href: "/dashboard/appointments",
    category: "clinical",
    defaultEnabled: false,
  },
  {
    key: "mod_screening",
    label: "Medical Screening",
    labelPt: "Triagem Médica",
    description: "Complete medical screening form",
    icon: Shield,
    href: "/dashboard/screening",
    category: "clinical",
    defaultEnabled: true,
  },
  {
    key: "mod_treatment",
    label: "Treatment Plan",
    labelPt: "Plano de Tratamento",
    description: "View treatment protocol and track progress",
    icon: Heart,
    href: "/dashboard/treatment",
    category: "clinical",
    defaultEnabled: false,
  },
  {
    key: "mod_records",
    label: "My Records",
    labelPt: "Meus Registros",
    description: "Access treatment history and clinical notes",
    icon: FileText,
    href: "/dashboard/records",
    category: "clinical",
    defaultEnabled: false,
  },
  {
    key: "mod_clinical_notes",
    label: "Clinical Notes",
    labelPt: "Notas Clínicas",
    description: "View clinical notes from sessions",
    icon: ClipboardList,
    href: "/dashboard/clinical-notes",
    category: "clinical",
    defaultEnabled: false,
  },
  {
    key: "mod_foot_scans",
    label: "Foot Scans",
    labelPt: "Escaneamento dos Pés",
    description: "View foot scan results and reports",
    icon: Footprints,
    href: "/dashboard/scans",
    category: "clinical",
    defaultEnabled: false,
  },
  {
    key: "mod_body_assessments",
    label: "Body Assessment",
    labelPt: "Avaliação Corporal",
    description: "View biomechanical assessment results",
    icon: Activity,
    href: "/dashboard/body-assessments",
    category: "clinical",
    defaultEnabled: false,
  },
  {
    key: "mod_documents",
    label: "My Documents",
    labelPt: "Meus Documentos",
    description: "Upload and view medical documents",
    icon: FileUp,
    href: "/dashboard/documents",
    category: "clinical",
    defaultEnabled: false,
  },

  // ── WELLNESS (self-service health tools) ──
  {
    key: "mod_exercises",
    label: "My Exercises",
    labelPt: "Meus Exercícios",
    description: "View prescribed exercises with video guidance",
    icon: Dumbbell,
    href: "/dashboard/exercises",
    category: "wellness",
    defaultEnabled: true,
  },
  {
    key: "mod_blood_pressure",
    label: "Blood Pressure",
    labelPt: "Pressão Arterial",
    description: "Track blood pressure readings",
    icon: HeartPulse,
    href: "/dashboard/blood-pressure",
    category: "wellness",
    defaultEnabled: true,
  },
  {
    key: "mod_education",
    label: "Education",
    labelPt: "Educação",
    description: "Access educational content and articles",
    icon: GraduationCap,
    href: "/dashboard/education",
    category: "content",
    defaultEnabled: true,
  },
  {
    key: "mod_quizzes",
    label: "Quizzes",
    labelPt: "Quizzes",
    description: "Educational quizzes to learn about your condition",
    icon: BookOpen,
    href: "/dashboard/quizzes",
    category: "content",
    defaultEnabled: true,
  },
  {
    key: "mod_achievements",
    label: "Achievements",
    labelPt: "Conquistas",
    description: "Track your progress badges and achievements",
    icon: Trophy,
    href: "/dashboard/achievements",
    category: "content",
    defaultEnabled: true,
  },
];

// ─── Permission Definitions ────────────────────────────────
// Granular permissions within modules.

export interface PermissionDefinition {
  key: string;           // Unique key stored in MembershipPlan.features[]
  label: string;
  labelPt: string;
  description: string;
  icon: LucideIcon;
  category: "booking" | "communication" | "content" | "clinical" | "advanced";
  relatedModule?: string; // Which module this permission relates to
  defaultEnabled?: boolean;
}

export const PERMISSION_REGISTRY: PermissionDefinition[] = [
  // ── BOOKING ──
  {
    key: "perm_book_in_person",
    label: "Book In-Person Appointments",
    labelPt: "Agendar Consulta Presencial",
    description: "Allow booking in-person clinic visits",
    icon: Stethoscope,
    category: "booking",
    relatedModule: "mod_appointments",
    defaultEnabled: false,
  },
  {
    key: "perm_book_online",
    label: "Book Online Consultations",
    labelPt: "Agendar Consulta Online",
    description: "Allow booking video consultations",
    icon: Video,
    category: "booking",
    relatedModule: "mod_appointments",
    defaultEnabled: false,
  },

  // ── CONTENT ──
  {
    key: "perm_view_exercise_videos",
    label: "View Exercise Videos",
    labelPt: "Ver Vídeos de Exercícios",
    description: "Access exercise demonstration videos",
    icon: Dumbbell,
    category: "content",
    relatedModule: "mod_exercises",
    defaultEnabled: true,
  },
  {
    key: "perm_view_education",
    label: "View Educational Articles",
    labelPt: "Ver Artigos Educativos",
    description: "Access health education content",
    icon: BookOpen,
    category: "content",
    relatedModule: "mod_education",
    defaultEnabled: true,
  },
  {
    key: "perm_download_reports",
    label: "Download PDF Reports",
    labelPt: "Baixar Relatórios PDF",
    description: "Download clinical reports and documents",
    icon: FileText,
    category: "content",
    defaultEnabled: false,
  },

  // ── COMMUNICATION ──
  {
    key: "perm_chat_therapist",
    label: "Chat with Therapist",
    labelPt: "Chat com Terapeuta",
    description: "Direct messaging with therapist",
    icon: MessageSquare,
    category: "communication",
    defaultEnabled: false,
  },
  {
    key: "perm_email_notifications",
    label: "Email Notifications",
    labelPt: "Notificações por Email",
    description: "Receive email updates and reminders",
    icon: Star,
    category: "communication",
    defaultEnabled: true,
  },
  {
    key: "perm_whatsapp_notifications",
    label: "WhatsApp Notifications",
    labelPt: "Notificações por WhatsApp",
    description: "Receive WhatsApp messages and reminders",
    icon: MessageSquare,
    category: "communication",
    defaultEnabled: false,
  },

  // ── CLINICAL ──
  {
    key: "perm_foot_scan_capture",
    label: "Foot Scan Self-Capture",
    labelPt: "Auto-captura de Escaneamento",
    description: "Self-capture foot scans from phone",
    icon: Footprints,
    category: "clinical",
    relatedModule: "mod_foot_scans",
    defaultEnabled: false,
  },
  {
    key: "perm_request_cancellation",
    label: "Request Cancellation",
    labelPt: "Solicitar Cancelamento",
    description: "Request appointment/plan cancellations",
    icon: Scale,
    category: "clinical",
    defaultEnabled: false,
  },

  // ── ADVANCED ──
  {
    key: "perm_ai_insights",
    label: "AI Health Insights",
    labelPt: "Insights de Saúde com IA",
    description: "AI-powered health recommendations",
    icon: Zap,
    category: "advanced",
    defaultEnabled: false,
  },
  {
    key: "perm_3d_viewer",
    label: "3D Model Viewer",
    labelPt: "Visualizador 3D",
    description: "View 3D body and foot models",
    icon: BarChart3,
    category: "advanced",
    relatedModule: "mod_foot_scans",
    defaultEnabled: false,
  },
  {
    key: "perm_progress_tracking",
    label: "Progress Tracking",
    labelPt: "Acompanhamento de Progresso",
    description: "Track rehabilitation progress over time",
    icon: BarChart3,
    category: "advanced",
    relatedModule: "mod_treatment",
    defaultEnabled: false,
  },
];

// ─── Helpers ───────────────────────────────────────────────

/** All feature keys (modules + permissions) for convenience */
export const ALL_FEATURE_KEYS = [
  ...MODULE_REGISTRY.map((m) => m.key),
  ...PERMISSION_REGISTRY.map((p) => p.key),
];

/** Get module definition by key */
export function getModuleByKey(key: string): ModuleDefinition | undefined {
  return MODULE_REGISTRY.find((m) => m.key === key);
}

/** Get permission definition by key */
export function getPermissionByKey(key: string): PermissionDefinition | undefined {
  return PERMISSION_REGISTRY.find((p) => p.key === key);
}

/** Core modules that are always visible regardless of plan */
export const ALWAYS_VISIBLE_MODULES = MODULE_REGISTRY.filter((m) => m.alwaysVisible);

/** Gated modules that require plan access */
export const GATED_MODULES = MODULE_REGISTRY.filter((m) => !m.alwaysVisible);

/** Map module key → dashboard href */
export const MODULE_HREF_MAP: Record<string, string> = Object.fromEntries(
  MODULE_REGISTRY.map((m) => [m.key, m.href])
);

/** Map dashboard href → module key (for enforcement lookups) */
export const HREF_MODULE_MAP: Record<string, string> = Object.fromEntries(
  MODULE_REGISTRY.map((m) => [m.href, m.key])
);

/** Default features for a basic free membership */
export const DEFAULT_FREE_FEATURES = [
  "mod_dashboard",
  "mod_profile",
  "mod_plans",
  "mod_consent",
  "mod_screening",
  "mod_education",
  "mod_exercises",
  "mod_blood_pressure",
  "perm_view_exercise_videos",
  "perm_view_education",
  "perm_email_notifications",
];

/** Default features for a premium membership */
export const DEFAULT_PREMIUM_FEATURES = ALL_FEATURE_KEYS;

/** Module categories for grouping in the admin UI */
export const MODULE_CATEGORIES = [
  { key: "core", label: "Core (Always Visible)", labelPt: "Base (Sempre Visível)" },
  { key: "clinical", label: "Clinical", labelPt: "Clínico" },
  { key: "wellness", label: "Wellness & Self-Care", labelPt: "Bem-Estar" },
  { key: "content", label: "Content & Education", labelPt: "Conteúdo & Educação" },
] as const;

export const PERMISSION_CATEGORIES = [
  { key: "booking", label: "Booking", labelPt: "Agendamento" },
  { key: "content", label: "Content Access", labelPt: "Acesso a Conteúdo" },
  { key: "communication", label: "Communication", labelPt: "Comunicação" },
  { key: "clinical", label: "Clinical", labelPt: "Clínico" },
  { key: "advanced", label: "Advanced Features", labelPt: "Recursos Avançados" },
] as const;
