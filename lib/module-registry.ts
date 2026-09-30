// ============================================
// CENTRALIZED MODULE & PERMISSION REGISTRY
// Single source of truth for all patient-facing modules and permissions.
// Used by: Admin membership editor, patient dashboard sidebar,
//          access enforcement middleware, module gate component.
// ============================================

import {
  LayoutDashboard,
  Calendar,
  FileText,
  Shield,
  GraduationCap,
  Dumbbell,
  Heart,
  FileUp,
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
  Map,
  ShoppingCart,
  Mic,
  Bell,
  Watch,
  FlaskConical,
  BriefcaseMedical,
  type LucideIcon,
} from "lucide-react";

// ─── Module Definitions ────────────────────────────────────
// Each module maps to a dashboard route the patient can access.

export interface ModuleDefinition {
  key: string;            // Unique key stored in MembershipPlan.features[]
  label: string;          // Display label (English)
  labelPt: string;        // Display label (Portuguese)
  description: string;    // Short explanation (English)
  descriptionPt: string;  // Short explanation (Portuguese)
  icon: LucideIcon;
  href: string;           // Dashboard route
  /** `app_areas` são as áreas entre as quais o app alterna, não telas da web. */
  category: "core" | "clinical" | "wellness" | "content" | "admin_only" | "app_areas";
  alwaysVisible?: boolean; // true = always shown in sidebar (dashboard, profile, plans, consent)
  defaultEnabled?: boolean; // true = enabled by default when creating a new plan
  /**
   * Granted unless an admin takes it away — and still toggleable, unlike
   * `alwaysVisible`, which the permissions screen pins to "unlocked".
   *
   * This exists for surfaces that shipped before anything governed them.
   * No existing plan lists them in `features[]`, so gating them on a plan
   * would take Messages away from every patient who has one — the switch is
   * meant to be new, not the refusal.
   */
  defaultGranted?: boolean;
  /** Governs the app only: the web has no page of its own for it. */
  appOnly?: boolean;
  /**
   * **O que este interruptor acende no app**, com o nome que o paciente lê ali.
   *
   * O painel dizia *BPR Journey* e o app mostrava *Daily check-in*; dizia
   * *Education* e o app mostrava *Articles*; dizia *My Records* e o app mostrava
   * *Outcome measures* e *My reports*. Quem ligava não sabia o que tinha ligado,
   * e o Bruno só descobriu ligando três e não vendo nada.
   *
   * Renomear os quatro rótulos resolveria hoje e voltaria a divergir na próxima
   * tela que alguém acrescentasse. Isto é declarado aqui e **cobrado contra o
   * menu de verdade** por `__tests__/permissoes/o-painel-nao-promete.test.ts`:
   * um nome que o menu não tem faz o teste cair.
   *
   * Vazio ou ausente quando o módulo não tem linha no menu — as abas, as áreas,
   * e os quatro sem tela.
   */
  mostraNoApp?: Array<{ en: string; pt: string }>;
  /**
   * **A tela ainda não existe no app** — ligar isto não muda o que o paciente vê.
   *
   * O Bruno ligou *Achievements*, *BPR Journey* e *Community* e nada apareceu no
   * telefone. Três destes quatro têm rota na web e nenhuma tela no app, e o app é
   * o único alvo do paciente depois do lançamento: o interruptor prometia uma
   * coisa que não havia onde acontecer.
   *
   * O selo **informa, não trava**. A API continua aceitando gravar o módulo: uma
   * trava aqui seria um segundo lugar para alguém esquecer de destravar no dia
   * em que a tela nascer, e aí a tela existiria e ninguém conseguiria ligá-la.
   *
   * Quando a tela nascer, tire a linha — e o teste
   * `__tests__/permissoes/o-painel-nao-promete.test.ts` cobra o inverso: um
   * módulo que o menu do app já mostra **não** pode ficar com o selo.
   */
  semTelaNoApp?: boolean;
}

export const MODULE_REGISTRY: ModuleDefinition[] = [
  // ── CORE (always visible, cannot be disabled) ──
  {
    key: "mod_dashboard",
    label: "Dashboard",
    labelPt: "Painel",
    description: "Main dashboard overview",
    descriptionPt: "Visão geral do painel principal",
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
    descriptionPt: "Ver e editar informações pessoais",
    icon: User,
    href: "/dashboard/profile",
    category: "core",
    alwaysVisible: true,
    defaultEnabled: true,
  },
  {
    key: "mod_plans",
    mostraNoApp: [{ en: "Plans", pt: "Planos" }],
    label: "Plans & Membership",
    labelPt: "Planos & Assinatura",
    description: "View available plans and manage subscription",
    descriptionPt: "Ver planos disponíveis e gerenciar assinatura",
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
    descriptionPt: "Aceitar os termos de uso e a política de privacidade",
    icon: Scale,
    href: "/dashboard/consent",
    category: "core",
    alwaysVisible: true,
    defaultEnabled: true,
  },
  {
    key: "mod_guide",
    mostraNoApp: [{ en: "How it works", pt: "Como funciona" }],
    label: "How It Works",
    labelPt: "Como Funciona",
    description: "Patient guide — what to do before your appointment",
    descriptionPt: "Guia do paciente — o que fazer antes da sua consulta",
    icon: BookOpen,
    href: "/dashboard/guide",
    category: "core",
    alwaysVisible: true,
    defaultEnabled: true,
  },

  // ── Screening (always visible — required for onboarding) ──
  {
    key: "mod_screening",
    mostraNoApp: [{ en: "Assessment screening", pt: "Avaliação" }, { en: "My progress", pt: "Meu progresso" }],
    label: "Assessment Screening",
    labelPt: "Triagem de Avaliação",
    description: "Complete assessment screening form",
    descriptionPt: "Preencher o formulário de triagem de avaliação",
    icon: Shield,
    href: "/dashboard/screening",
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
    descriptionPt: "Agendar e gerenciar consultas",
    icon: Calendar,
    href: "/dashboard/appointments",
    category: "clinical",
    defaultEnabled: false,
  },
  {
    key: "mod_treatment",
    mostraNoApp: [{ en: "Treatment plan", pt: "Plano de tratamento" }],
    label: "Treatment Plan",
    labelPt: "Plano de Tratamento",
    description: "View treatment protocol and track progress",
    descriptionPt: "Ver o protocolo de tratamento e acompanhar o progresso",
    icon: Heart,
    href: "/dashboard/treatment",
    category: "clinical",
    defaultEnabled: false,
  },
  {
    key: "mod_records",
    mostraNoApp: [{ en: "Outcome measures", pt: "Medidas de evolução" }, { en: "My reports", pt: "Meus relatórios" }],
    label: "My Records",
    labelPt: "Meus Registros",
    description: "Outcome measures and follow-up reports — what is written for the patient",
    descriptionPt: "Medidas de evolução e relatórios de acompanhamento — o que é escrito para o paciente",
    icon: FileText,
    href: "/dashboard/records",
    category: "clinical",
    defaultEnabled: false,
  },
  {
    key: "mod_tasks",
    mostraNoApp: [{ en: "Pending actions", pt: "Pendências" }],
    label: "Pending Actions",
    labelPt: "Ações Pendentes",
    description: "View and complete actions requested by your clinic",
    descriptionPt: "Ver e concluir ações solicitadas pela clínica",
    icon: Bell,
    href: "/dashboard/tasks",
    category: "clinical",
    defaultEnabled: true,
  },
  {
    key: "mod_recordings",
    label: "Pre-Consultation Recording",
    labelPt: "Gravação Pré-Consulta",
    description: "Record symptoms before your appointment",
    descriptionPt: "Grave seus sintomas antes da consulta",
    icon: Mic,
    href: "/dashboard/recordings",
    category: "clinical",
    defaultEnabled: true,
    semTelaNoApp: true,
  },
  {
    key: "mod_clinical_notes",
    mostraNoApp: [{ en: "My records", pt: "Meu prontuário" }],
    label: "Clinical Notes",
    labelPt: "Notas Clínicas",
    description: "The therapist's session notes, written clinician to clinician",
    descriptionPt: "As notas de sessão do terapeuta, escritas de profissional para profissional",
    icon: ClipboardList,
    href: "/dashboard/clinical-notes",
    category: "clinical",
    defaultEnabled: false,
  },
  {
    key: "mod_documents",
    mostraNoApp: [{ en: "My documents", pt: "Meus documentos" }],
    label: "My Documents",
    labelPt: "Meus Documentos",
    description: "Upload and view medical documents",
    descriptionPt: "Enviar e visualizar documentos médicos",
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
    descriptionPt: "Ver exercícios prescritos com vídeos de orientação",
    icon: Dumbbell,
    // Activity 43 — "My Exercises" (the separate page) is retired; this
    // module's exercises now live on the Treatment Plan page alongside any
    // protocol items. fetchProtocols() there treats a missing mod_treatment
    // as "no protocols" rather than an error, so an exercises-only patient
    // (this module without mod_treatment) still gets a working page.
    href: "/dashboard/treatment",
    category: "wellness",
    defaultEnabled: true,
  },
  {
    key: "mod_education",
    mostraNoApp: [{ en: "Articles", pt: "Artigos" }],
    label: "Education",
    labelPt: "Educação",
    description: "Access educational content and articles",
    descriptionPt: "Acessar conteúdo educativo e artigos",
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
    descriptionPt: "Quizzes educativos para aprender sobre sua condição",
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
    descriptionPt: "Acompanhar seus emblemas de progresso e conquistas",
    icon: Trophy,
    href: "/dashboard/achievements",
    category: "content",
    defaultEnabled: true,
    semTelaNoApp: true,
  },


  // ── JOURNEY (BPR Journey section) ──
  {
    key: "mod_journey",
    mostraNoApp: [{ en: "Daily check-in", pt: "Check-in diário" }],
    label: "BPR Journey",
    labelPt: "Jornada BPR",
    description: "Your rehabilitation journey milestones and progress",
    descriptionPt: "Marcos e progresso da sua jornada de reabilitação",
    icon: Map,
    href: "/dashboard/journey",
    category: "content",
    defaultEnabled: true,
  },
  {
    key: "mod_community",
    label: "Community",
    labelPt: "Comunidade",
    description: "Connect with other patients and share experiences",
    descriptionPt: "Conecte-se com outros pacientes e compartilhe experiências",
    icon: Trophy,
    href: "/dashboard/community",
    category: "content",
    defaultEnabled: true,
    semTelaNoApp: true,
  },
  {
    key: "mod_marketplace",
    label: "Marketplace",
    labelPt: "Marketplace",
    description: "Browse rehabilitation products, insoles and accessories",
    descriptionPt: "Explore produtos de reabilitação, palmilhas e acessórios",
    icon: ShoppingCart,
    href: "/dashboard/marketplace",
    category: "content",
    defaultEnabled: false,
    semTelaNoApp: true,
  },

  // ── Added when nothing governed them ──
  // Both were reachable in the app with no way to switch them off: the registry
  // had no entry, so the permissions screen had no row and the app had no key
  // to gate on. Messages still carries no `href`, because on the web it lives
  // in the sidebar panel rather than a page of its own; an empty href keeps it
  // out of the menu, which filters on that, while the admin can still toggle
  // it. Devices has an address now — /dashboard/biohacking was split so the
  // check-in (`mod_journey`) and the devices stopped sharing one page.
  {
    key: "mod_messages",
    mostraNoApp: [{ en: "Messages", pt: "Mensagens" }],
    label: "Messages",
    labelPt: "Mensagens",
    description: "Message the clinic and read its replies",
    descriptionPt: "Conversar com a clínica e ler as respostas",
    icon: MessageSquare,
    href: "",
    category: "clinical",
    defaultGranted: true,
    defaultEnabled: true,
    appOnly: true,
  },
  {
    key: "mod_devices",
    mostraNoApp: [{ en: "Devices", pt: "Dispositivos" }],
    label: "Devices",
    labelPt: "Dispositivos",
    description: "Connect a wearable and see its sleep, activity and recovery data",
    descriptionPt: "Conectar um wearable e ver dados de sono, atividade e recuperação",
    icon: Watch,
    href: "/dashboard/devices",
    category: "wellness",
    defaultGranted: true,
    defaultEnabled: false,
  },

  /**
   * ── ÁREAS DO APP ──
   *
   * Estas duas não são telas: são as **áreas** entre as quais o app do paciente
   * alterna. `/api/mobile/modules` já obedecia `mod_lab` e `mod_clinica` desde a
   * 083 — o que faltava era estarem aqui, porque a tela de permissões monta a
   * lista a partir deste registro. O servidor sabia respeitar a decisão e o
   * Bruno não tinha onde tomá-la (26/09/2026).
   *
   * `appOnly` porque a web não tem página própria para nenhuma das duas.
   * `defaultGranted` fica **fora** de propósito: quem concede a área clínica é
   * ser paciente da clínica (`isClinicPatient`), e quem concede o laboratório é
   * o interruptor de /admin/labs. A linha aqui é a **exceção** de uma pessoa.
   */
  {
    key: "mod_lab",
    label: "Laboratory (app area)",
    labelPt: "Laboratório (área do app)",
    description:
      "Blood tests in the app. Released here for one patient even when the clinic-wide switch in Labs is off — which is how a pilot with two people works.",
    descriptionPt:
      "Exames de sangue no app. Liberado aqui para um paciente mesmo com o interruptor geral em Labs desligado — é assim que se faz um piloto com duas pessoas.",
    icon: FlaskConical,
    href: "",
    category: "app_areas",
    defaultEnabled: false,
    appOnly: true,
  },
  {
    key: "mod_clinica",
    label: "Clinic (app area)",
    labelPt: "Clínica (área do app)",
    description:
      "Records, exercises and messages. A patient gets this by being treated here; release it explicitly for an account the clinic created but has not seen yet.",
    descriptionPt:
      "Prontuário, exercícios e mensagens. O paciente ganha isto ao ser atendido; libere explicitamente uma conta que a clínica criou e ainda não atendeu.",
    icon: BriefcaseMedical,
    href: "",
    category: "app_areas",
    defaultEnabled: false,
    appOnly: true,
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
/** Granted to everyone until an admin says otherwise. */
export const DEFAULT_GRANTED_MODULES = MODULE_REGISTRY.filter((m) => m.defaultGranted);

/** Map module key → dashboard href */
export const MODULE_HREF_MAP: Record<string, string> = Object.fromEntries(
  MODULE_REGISTRY.map((m) => [m.key, m.href])
);

/** Map dashboard href → module key (for enforcement lookups) */
// Modules with no page of their own (Messages) would otherwise contribute an
// empty-string key, and a prefix check of `href.startsWith("" + "/")` matches
// every dashboard route — which silently made `canAccessHref` return true for
// everything and killed the sub-route gate.
export const HREF_MODULE_MAP: Record<string, string> = Object.fromEntries(
  MODULE_REGISTRY.filter((m) => m.href).map((m) => [m.href, m.key])
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
  { key: "app_areas", label: "App areas", labelPt: "Áreas do app" },
] as const;

/**
 * Os mesmos grupos, **com os nomes que o paciente lê** (112 T-1).
 *
 * O Bruno pediu o menu do app agrupado "como está na área da clinic". Os grupos
 * são os mesmos; os **nomes** não podem ser. `Core (Always Visible)` é conceito
 * de quem administra — diz respeito ao interruptor, não ao tratamento — e
 * `Clinical` é como a clínica fala de si, não como alguém fala do que está a
 * viver.
 *
 * E há um grupo que só existe deste lado: as linhas do menu **sem módulo**
 * (faturas, quem eu cuido, quem tem acesso, termos, notificações). Elas não têm
 * categoria no catálogo porque a categoria vive no módulo, e precisavam de casa.
 */
export const GRUPOS_NO_APP = [
  { key: "clinical", en: "Your care", pt: "Seu tratamento" },
  { key: "wellness", en: "Day to day", pt: "Seu dia a dia" },
  { key: "content", en: "Learn", pt: "Aprender" },
  { key: "account", en: "Your account", pt: "Sua conta" },
] as const;

export type GrupoNoApp = (typeof GRUPOS_NO_APP)[number]["key"];

/**
 * Onde cada módulo cai **no menu do paciente**, quando o grupo da clínica não
 * serve para ele.
 *
 * Quatro módulos são `core` no painel, e "base" não diz nada a quem lê:
 *
 * - a **avaliação** e o **progresso** são tratamento, e vão para lá;
 * - o **como funciona** é material de leitura, e vai para *Aprender*;
 * - os **planos** são da conta, e não do tratamento.
 *
 * E um quinto, que não é `core`: a **jornada** é material no painel, mas no app
 * ela acende o check-in diário — que é o que a pessoa faz todo dia, e não algo
 * que ela lê.
 *
 * O resto segue o grupo da clínica. Isto **não** é uma segunda categorização do
 * catálogo: é a tradução de uma taxonomia de administração para a de quem é
 * tratado, e um teste cobra que todo módulo do menu tenha um grupo.
 */
export const GRUPO_NO_APP_POR_MODULO: Record<string, GrupoNoApp> = {
  mod_screening: "clinical",
  mod_guide: "content",
  mod_plans: "account",
  // `mod_journey` é `content` no painel porque a jornada é material. No app ele
  // acende o **check-in diário**, e check-in diário não é aprender — é o que a
  // pessoa faz todo dia. Achado ao listar o que cada grupo mostraria de facto,
  // antes de a tela existir.
  mod_journey: "wellness",
};

/**
 * O que **não** é linha de menu, e por isso não tem grupo.
 *
 * As quatro abas, o cabeçalho do perfil e as duas áreas. Sem esta lista,
 * `mod_appointments` e `mod_exercises` caíam no grupo `clinical` da clínica e
 * apareceriam **duas vezes** — uma como aba e outra dentro de *Seu tratamento*.
 * Foi o teste que apanhou, antes de a tela existir.
 */
const FORA_DO_MENU_DO_APP = new Set([
  "mod_dashboard",    // aba Início
  "mod_appointments", // aba Consultas
  "mod_exercises",    // aba Exercícios
  "mod_profile",      // o cabeçalho do perfil
  "mod_lab",          // "Trocar de área"
  "mod_clinica",      // "Trocar de área"
]);

/** O grupo do módulo no menu do paciente. */
export function grupoNoApp(chave: string): GrupoNoApp | null {
  if (FORA_DO_MENU_DO_APP.has(chave)) return null;
  if (GRUPO_NO_APP_POR_MODULO[chave]) return GRUPO_NO_APP_POR_MODULO[chave];
  const m = MODULE_REGISTRY.find((x) => x.key === chave);
  if (!m) return null;
  if (m.category === "clinical" || m.category === "wellness" || m.category === "content") {
    return m.category;
  }
  // `core` e `app_areas` que não foram recolocados não aparecem como linha de
  // menu: são abas, o cabeçalho do perfil, ou a troca de área.
  return null;
}

export const PERMISSION_CATEGORIES = [
  { key: "booking", label: "Booking", labelPt: "Agendamento" },
  { key: "content", label: "Content Access", labelPt: "Acesso a Conteúdo" },
  { key: "communication", label: "Communication", labelPt: "Comunicação" },
  { key: "clinical", label: "Clinical", labelPt: "Clínico" },
  { key: "advanced", label: "Advanced Features", labelPt: "Recursos Avançados" },
] as const;
