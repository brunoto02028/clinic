// lib/admin-sections.ts
import {
  Calendar,
  Users,
  Stethoscope,
  Megaphone,
  DollarSign,
  Settings,
  BellRing,
  Trophy,
  Apple,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";

export interface AdminTab {
  key: string;
  label: string;
  labelPt: string;
  href: string;
  matchRoutes?: string[];
  /** Hidden for a personal-trainer tenant (purely clinical: SOAP, protocols, rehab). */
  clinicalOnly?: boolean;
  /** Shown ONLY to a personal-trainer tenant (e.g. Challenges). */
  personalOnly?: boolean;
  /** Platform-wide (BPR site, all tenants, platform AI/logs) — SUPERADMIN only. */
  superadminOnly?: boolean;
  /** The tenant owner's (ADMIN/SUPERADMIN) — hidden from a THERAPIST. */
  ownerOnly?: boolean;
}

export interface AdminSection {
  key: string;
  label: string;
  labelPt: string;
  icon: LucideIcon;
  tabs: AdminTab[];
  matchRoutes?: string[];
  /** Whole section hidden for a personal-trainer tenant. */
  clinicalOnly?: boolean;
  /** Whole section shown ONLY to a personal-trainer tenant (e.g. Challenges). */
  personalOnly?: boolean;
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
      /**
       * Telas que a varredura (100 T-4) achou sem caminho.
       *
       * O Bruno: *"coloca tudo no menu"* e *"eu quero escolher o que nao vamos
       * usar depois"*. Entao elas entram como estao, e a triagem e dele.
       *
       * Os rotulos descrevem o que a tela **e**, nao o que o nome da rota
       * sugere — e onde duas telas parecem a mesma coisa, o rotulo diz isso.
       */
      {
        key: "calls",
        label: "Calls",
        labelPt: "Ligacoes",
        href: "/admin/calls",
        matchRoutes: ["/admin/calls"],
      },
      {
        /**
         * A consulta por video, clicavel (28/09/2026).
         *
         * `/admin/video-consultations` era citada so em `matchRoutes` — que
         * **acende a secao e nao leva a lugar nenhum** — e as duas mencoes na
         * agenda sao comentarios, nao links. Ou seja: a tela nao tinha porta,
         * e o Bruno perguntou duas vezes onde ela ficava.
         *
         * E dela que sai o "Test it now", que marca uma consulta de teste para
         * daqui a cinco minutos.
         */
        key: "video-consultations",
        label: "Video consultations",
        labelPt: "Consultas por video",
        href: "/admin/video-consultations",
        matchRoutes: ["/admin/video-consultations"],
        clinicalOnly: true,
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
        clinicalOnly: true,
      },
      {
        key: "tasks",
        label: "Tasks",
        labelPt: "Tarefas",
        href: "/admin/patient-tasks",
      },
      {
        // Quem tem o app, onde está e quanto tempo fica (085, T-3). O dado já
        // era gravado desde a T-1 e não tinha tela; `/admin/analytics` mostra
        // visitante do site, que responde outra pergunta.
        key: "app-usage",
        label: "App",
        labelPt: "App",
        href: "/admin/app-usage",
        matchRoutes: ["/admin/app-usage"],
      },
      {
        // O badge vermelho contava os vídeos e não dizia quais. O backend já
        // respondia `?pending=1` desde a 076 e nenhuma tela perguntava — o
        // único caminho até um vídeo era abrir o prontuário e achar a aba
        // (087, T-4). Aqui está a porta.
        key: "submissions",
        label: "Videos",
        labelPt: "Vídeos",
        href: "/admin/exercise-submissions",
        matchRoutes: ["/admin/exercise-submissions"],
      },
      {
        // Readings from the clinic's own cuff that matched no measurement
        // window (activity 074, T-15). It needs a door in the navigation, or
        // the only way to reach it is the link on an expired measurement.
        key: "measurements",
        label: "Measurements",
        labelPt: "Medições",
        href: "/admin/measurements/inbox",
        matchRoutes: ["/admin/measurements/inbox"],
        clinicalOnly: true,
      },
      {
        key: "portal",
        label: "Portal",
        labelPt: "Portal",
        href: "/admin/patient-portal",
        // One config for every tenant's patients (SiteSettings) — activity 52, T-2.
        superadminOnly: true,
        matchRoutes: ["/admin/patient-portal"],
      },
      {
        // Journey, conditions, quizzes and achievements are per tenant — they
        // used to hang off the Portal tab, which is now SUPERADMIN-only.
        key: "journey",
        label: "Journey",
        labelPt: "Jornada",
        href: "/admin/journey",
        matchRoutes: [
          "/admin/journey",
          "/admin/conditions",
          "/admin/quizzes",
          "/admin/achievements",
        ],
        // BPR's rehab gamification — a studio's students don't have it (activity 59).
        clinicalOnly: true,
      },
      {
        // What a studio's students still use from that area, reachable directly.
        key: "quizzes",
        label: "Quizzes",
        labelPt: "Quizzes",
        href: "/admin/quizzes",
        personalOnly: true,
      },
      {
        key: "achievements",
        label: "Achievements",
        labelPt: "Conquistas",
        href: "/admin/achievements",
        personalOnly: true,
      },
    ],
    matchRoutes: [
      "/admin/patients",
      "/admin/screening-preview",
      "/admin/patient-tasks",
      // Sem isto a aba "Medições" cai na seção Agenda ao ser clicada: o título
      // vira "Agenda", a barra troca de abas e a própria aba desaparece.
      "/admin/measurements",
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
    labelPt: "Notificações",
    icon: BellRing,
    tabs: [
      {
        // The rules themselves — limits and wording, editable without a
        // deploy (activity 072, T-6). The tenant owner's, not a therapist's.
        key: "automation-rules",
        label: "Automation rules",
        labelPt: "Regras da automação",
        href: "/admin/automation",
        matchRoutes: ["/admin/automation"],
        clinicalOnly: true,
        ownerOnly: true,
      },
      {
        // Messages an automation wrote, waiting for a human (activity 072).
        // Nothing leaves the building from here without a click.
        key: "outbox",
        label: "Waiting for you",
        labelPt: "Esperando você",
        href: "/admin/outbox",
        matchRoutes: ["/admin/outbox"],
        clinicalOnly: true,
      },
      {
        // What the automation engine raised for the therapist (activity 072).
        // Internal: nothing here was sent to a patient.
        key: "alerts",
        label: "Alerts",
        labelPt: "Alertas",
        href: "/admin/alerts",
        matchRoutes: ["/admin/alerts"],
        clinicalOnly: true,
      },
      {
        key: "broadcast",
        label: "Broadcast",
        labelPt: "Avisos Gerais",
        href: "/admin/notifications",
        matchRoutes: ["/admin/notifications"],
      },
      {
        // Admin-editable copy for the automated reminders (activity 62, T-5) —
        // listed here so the nav highlights correctly instead of falling
        // back to whatever tab was active before navigating here.
        key: "reminder-templates",
        label: "Reminder Templates",
        labelPt: "Textos de Lembretes",
        href: "/admin/reminder-templates",
        matchRoutes: ["/admin/reminder-templates"],
      },
    ],
    matchRoutes: ["/admin/alerts", "/admin/outbox", "/admin/automation", "/admin/notifications", "/admin/reminder-templates"],
  },
  {
    key: "clinical",
    label: "Clinical",
    labelPt: "Clínico",
    icon: Stethoscope,
    tabs: [
      {
        key: "notes",
        label: "SOAP Notes",
        labelPt: "Notas SOAP",
        href: "/admin/clinical-notes",
        clinicalOnly: true,
      },
      {
        // Clinic-only: its checkout (app/api/patient/treatment-plans/checkout)
        // uses the single global BPR Stripe account, not stripeFor(clinicId)
        // (activity 28's per-trainer Connect account) — showing this to a
        // personal trainer would route their student's payment to the wrong
        // account. Personal trainers use Program Templates + activity 28's
        // billing instead.
        key: "treatments",
        label: "Treatments",
        labelPt: "Tratamentos",
        href: "/admin/treatment-plans",
        matchRoutes: ["/admin/treatment-plans", "/admin/treatment-types"],
        clinicalOnly: true,
      },
      {
        // Exames de laboratório vendidos pelo app (081): catálogo com preço e
        // margem, pedidos, e a fila de resultados esperando a revisão do
        // terapeuta antes de o paciente ver.
        key: "labs",
        label: "Lab tests",
        labelPt: "Exames",
        href: "/admin/labs",
        matchRoutes: ["/admin/labs"],
        clinicalOnly: true,
      },
      {
        key: "exercises",
        label: "Exercises",
        labelPt: "Exercicios",
        href: "/admin/exercises",
      },
      /**
       * O material do paciente mora aqui, e não em Marketing (099/096).
       *
       * Estava na nona aba de Marketing, entre "Condições (SEO)" e
       * "Materiais", chamado "Education" — e o Bruno não achou. Com razão:
       * quem procura o que **mandar para um paciente** olha em Clínico, ao
       * lado de Exercícios e Protocolos, não numa lista de coisas de
       * divulgação.
       *
       * E o nome mudou: "Education" descrevia a tabela; "Patient education"
       * descreve o que a pessoa quer fazer.
       */
      {
        /**
         * O acompanhamento contínuo, no menu (099).
         *
         * `/admin/biohacking` existia e **nenhuma seção o citava** — o Bruno
         * teve de digitar o endereço à mão, e errou uma barra. É a mesma falta
         * de caminho que escondeu o material do paciente.
         *
         * Aqui moram a chave da automação dos relatórios e a fila de desvios —
         * as duas coisas que fazem o relógio e o medidor valerem alguma coisa.
         */
        key: "biohacking",
        label: "Monitoring",
        labelPt: "Monitoramento",
        href: "/admin/biohacking",
        matchRoutes: ["/admin/biohacking", "/admin/measurements"],
        clinicalOnly: true,
      },
      /**
       * As telas que a varredura (100 T-4) achou sem caminho nenhum.
       *
       * O Bruno: *"coloca tudo no menu"* e *"eu quero escolher o que nao vamos
       * usar depois"*. Entao elas entram como estao, e a triagem e dele.
       *
       * Os rotulos dizem o que a tela **e**, nao o que a rota sugere — e onde
       * duas parecem a mesma coisa, o rotulo diz isso em vez de esconder.
       */
      {
        key: "clinical-ai",
        label: "Clinical AI",
        labelPt: "IA clinica",
        href: "/admin/clinical-ai",
        matchRoutes: ["/admin/clinical-ai"],
        clinicalOnly: true,
      },
      {
        key: "foot-scans",
        label: "Foot scans",
        labelPt: "Escaneamento de pes",
        href: "/admin/foot-scans",
        matchRoutes: ["/admin/foot-scans"],
        clinicalOnly: true,
      },
      {
        // Usa o mesmo titulo de "Foot scans" (`admin.footScansTitle`): pode ser
        // uma segunda versao da mesma tela.
        key: "scans",
        label: "Scans (2nd version?)",
        labelPt: "Scans (2a versao?)",
        href: "/admin/scans",
        matchRoutes: ["/admin/scans", "/admin/scans/report-preview"],
        clinicalOnly: true,
      },
      {
        // Usa `admin.treatmentTypesTitle` — provavelmente outra porta para os
        // tipos de tratamento, que ja tem a aba "Treatments".
        key: "treatments-legacy",
        label: "Treatments (2nd version?)",
        labelPt: "Tratamentos (2a versao?)",
        href: "/admin/treatments",
        matchRoutes: ["/admin/treatments"],
        clinicalOnly: true,
      },
      {
        key: "body-models",
        label: "3D body models",
        labelPt: "Modelos 3D do corpo",
        href: "/admin/body-models",
        matchRoutes: ["/admin/body-models"],
        clinicalOnly: true,
      },
      {
        key: "patient-documents",
        label: "Documents (upload & process)",
        labelPt: "Documentos (enviar e processar)",
        href: "/admin/documents",
        matchRoutes: ["/admin/documents"],
        clinicalOnly: true,
      },
      {
        key: "programs",
        label: "Programs",
        labelPt: "Programas",
        href: "/admin/training-programs",
        matchRoutes: ["/admin/training-programs"],
        personalOnly: true,
      },
      {
        key: "protocols",
        label: "Protocols",
        labelPt: "Protocolos",
        href: "/admin/protocols",
        clinicalOnly: true,
        matchRoutes: ["/admin/protocols"],
      },
      {
        key: "equipment",
        label: "Equipment",
        labelPt: "Equipamentos",
        href: "/admin/equipment",
        clinicalOnly: true,
      },
      {
        key: "rehab-agent",
        label: "Rehab Agent",
        labelPt: "Agente Rehab",
        href: "/admin/clinical/rehab",
        clinicalOnly: true,
      },
    ],
    matchRoutes: [
      "/admin/clinical-notes",
      "/admin/clinical-ai",
      "/admin/treatment-plans",
      "/admin/treatment-types",
      "/admin/exercises",
      "/admin/training-programs",
      "/admin/protocols",
      "/admin/equipment",
      "/admin/clinical/rehab",
      // Sem isto, /admin/labs caía na seção Schedule (QA da T-2, 081).
      "/admin/labs",
    ],
  },
  {
    /**
     * Material do paciente tem espaco proprio (28/09/2026).
     *
     * O Bruno: *"esta indo la em Schedule (...) Schedule e a agenda. Nao pode
     * misturar. Tem que criar um outro espaco para isso"*.
     *
     * Ele tem razao por um motivo que vai alem do engano do menu: os artigos
     * que viram material clinico sao um assunto inteiro — trazer do site,
     * organizar, atribuir a alguem, acompanhar quem leu. Pendurar isso numa
     * aba de outra coisa foi o que o fez procurar em tres lugares.
     */
    key: "education",
    label: "Patient education",
    labelPt: "Material do paciente",
    icon: GraduationCap,
    clinicalOnly: true,
    tabs: [
      {
        key: "education-library",
        label: "Material",
        labelPt: "Material",
        href: "/admin/education",
        matchRoutes: ["/admin/education"],
      },
      {
        /**
         * O passo que faz o material chegar a alguem.
         *
         * Trazer para a clinica e mandar para um paciente sao duas decisoes
         * (096), e a segunda nao tinha porta nenhuma no menu.
         */
        key: "education-assignments",
        label: "Assign material",
        labelPt: "Atribuir material",
        href: "/admin/education/assignments",
        matchRoutes: ["/admin/education/assignments"],
      },
      {
        key: "education-categories",
        label: "Categories",
        labelPt: "Categorias",
        href: "/admin/education/categories",
        matchRoutes: ["/admin/education/categories"],
      },
      {
        key: "education-create",
        label: "Write material",
        labelPt: "Escrever material",
        href: "/admin/education/create",
        matchRoutes: ["/admin/education/create"],
      },
    ],
    matchRoutes: ["/admin/education"],
  },
  {
    key: "marketing",
    label: "Marketing",
    labelPt: "Marketing",
    icon: Megaphone,
    // Hidden for a personal-trainer tenant: the marketing content (articles,
    // education, campaigns) is the clinic's / BPR's, not the studio's.
    clinicalOnly: true,
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
        superadminOnly: true,
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
        ],
      },
      {
        key: "email-marketing",
        label: "Email Marketing",
        labelPt: "Email Marketing",
        href: "/admin/email-marketing",
        matchRoutes: ["/admin/email-marketing"],
      },
      {
        key: "leads",
        label: "Leads",
        labelPt: "Contatos",
        href: "/admin/marketing/leads",
      },
      {
        key: "book",
        label: "Beyond Pain (Book)",
        labelPt: "Beyond Pain (Livro)",
        href: "/admin/marketing/book",
      },
      {
        key: "condition-pages",
        label: "Conditions (SEO)",
        labelPt: "Condições (SEO)",
        href: "/admin/marketing/condition-pages",
      },
      {
        key: "sales",
        label: "Sales",
        labelPt: "Vendas",
        href: "/admin/sales",
        matchRoutes: ["/admin/sales"],
      },
      {
        key: "analytics",
        label: "Analytics",
        labelPt: "Analytics",
        href: "/admin/analytics",
        matchRoutes: ["/admin/analytics"],
      },
      {
        key: "materials",
        label: "Materials",
        labelPt: "Materiais",
        href: "/admin/marketing",
        matchRoutes: [
          "/admin/marketing/flyers",
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
      "/admin/sales",
    ],
  },
  {
    key: "challenges",
    label: "Challenges",
    labelPt: "Desafios",
    icon: Trophy,
    personalOnly: true,
    matchRoutes: ["/admin/challenges"],
    tabs: [
      {
        key: "challenges-list",
        label: "Challenges",
        labelPt: "Desafios",
        href: "/admin/challenges",
        matchRoutes: ["/admin/challenges"],
      },
    ],
  },
  {
    key: "nutrition",
    label: "Nutrition",
    labelPt: "Nutrição",
    icon: Apple,
    personalOnly: true,
    matchRoutes: ["/admin/nutrition"],
    tabs: [
      {
        key: "food-catalog",
        label: "Food Catalog",
        labelPt: "Alimentos",
        href: "/admin/nutrition",
        matchRoutes: ["/admin/nutrition"],
      },
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
        // The books are the owner's (activity 52, T-6) — not shown to a therapist.
        ownerOnly: true,
      },
      {
        key: "pricing",
        label: "Pricing",
        labelPt: "Precos",
        href: "/admin/service-pricing",
        // BPR's global prices/packages on the platform Stripe account (activity 52, T-2).
        superadminOnly: true,
      },
      {
        key: "coupons",
        label: "Coupons",
        labelPt: "Cupons",
        href: "/admin/coupons",
        // Mesma mão que define preço define desconto (084): superadmin.
        superadminOnly: true,
      },
      {
        key: "memberships",
        label: "Memberships",
        labelPt: "Memberships",
        href: "/admin/memberships",
        // Both charge on BPR's own Stripe account, never the studio's Connect
        // account — a studio bills through Billing instead (activity 52, T-7).
        clinicalOnly: true,
      },
      {
        key: "marketplace",
        label: "Marketplace",
        labelPt: "Marketplace",
        href: "/admin/marketplace",
        matchRoutes: ["/admin/marketplace"],
        clinicalOnly: true,
        ownerOnly: true,
      },
    ],
    matchRoutes: [
      "/admin/finance",
      "/admin/service-pricing",
      "/admin/coupons",
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
        superadminOnly: true,
      },
      {
        // The tenant's own brand (activity 52, T-3) — the BPR site is "General".
        key: "branding",
        label: "Branding",
        labelPt: "Marca",
        href: "/admin/studio-branding",
        ownerOnly: true,
      },
      /**
       * Telas sem caminho, achadas pela varredura (100 T-4), postas aqui a
       * pedido do Bruno para ele decidir depois o que fica.
       */
      {
        key: "ai-coworker",
        label: "AI Coworker",
        labelPt: "IA colega",
        href: "/admin/ai-coworker",
        matchRoutes: ["/admin/ai-coworker"],
      },
      {
        key: "agent-keys",
        label: "Agent keys",
        labelPt: "Chaves de agente",
        href: "/admin/agent-keys",
        matchRoutes: ["/admin/agent-keys"],
        superadminOnly: true,
      },
      {
        key: "voice-costs",
        label: "Voice costs",
        labelPt: "Custos de voz",
        href: "/admin/voice-costs",
        matchRoutes: ["/admin/voice-costs"],
        superadminOnly: true,
      },
      {
        key: "command-center",
        label: "Command Center",
        labelPt: "Central de comando",
        href: "/admin/command-center",
        matchRoutes: ["/admin/command-center"],
      },
      {
        key: "global-dashboard",
        label: "All clinics (platform)",
        labelPt: "Todas as clinicas (plataforma)",
        href: "/admin/global-dashboard",
        matchRoutes: ["/admin/global-dashboard"],
        superadminOnly: true,
      },
      {
        key: "study",
        label: "Study & activities",
        labelPt: "Estudo e atividades",
        href: "/admin/study",
        matchRoutes: ["/admin/study"],
      },
      {
        key: "cpd-courses",
        label: "CPD courses",
        labelPt: "Cursos CPD",
        href: "/admin/cpd-courses",
        matchRoutes: ["/admin/cpd-courses"],
      },
      {
        key: "my-education",
        label: "My education (AI advisor)",
        labelPt: "Minha educacao (consultor IA)",
        href: "/admin/my-education",
        matchRoutes: ["/admin/my-education"],
      },
      {
        key: "email-test",
        label: "Email test",
        labelPt: "Teste de e-mail",
        href: "/admin/email-test",
        matchRoutes: ["/admin/email-test"],
        superadminOnly: true,
      },
      {
        // Tela de login dentro do painel: quem esta aqui ja entrou. Fica na
        // lista para o Bruno ver e decidir — provavelmente para apagar.
        key: "admin-login-legacy",
        label: "Login page (legacy)",
        labelPt: "Tela de login (antiga)",
        href: "/admin/login",
        matchRoutes: ["/admin/login"],
        superadminOnly: true,
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
        superadminOnly: true,
      },
      {
        key: "ai",
        label: "AI",
        labelPt: "AI",
        href: "/admin/ai-settings",
        matchRoutes: ["/admin/ai-settings", "/admin/ai-coworker"],
        superadminOnly: true,
      },
      {
        key: "security",
        label: "Security",
        labelPt: "Seguranca",
        href: "/admin/security",
        matchRoutes: ["/admin/security", "/admin/agent-keys"],
        superadminOnly: true,
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
        superadminOnly: true,
      },
    ],
    matchRoutes: [
      "/admin/settings",
      "/admin/studio-branding",
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
export function routeMatches(pathname: string, route: string): boolean {
  // Exact "/admin" should only match the root dashboard, not all admin routes
  if (route === "/admin") {
    return pathname === "/admin";
  }
  const routePath = route.split("?")[0];
  return pathname === routePath || pathname.startsWith(routePath + "/");
}

/** Role-based part of a tab's visibility (the tenant-type part is separate). */
export function tabAllowedFor(tab: AdminTab, role?: string): boolean {
  if (tab.superadminOnly && role !== "SUPERADMIN") return false;
  if (tab.ownerOnly && role !== "SUPERADMIN" && role !== "ADMIN") return false;
  return true;
}

/**
 * The sections/tabs a tenant sees. A personal-trainer studio drops the
 * clinicalOnly sections/tabs (SOAP notes, protocols, rehab agent); a clinic
 * drops the personalOnly sections/tabs (e.g. Challenges). Either way a section
 * left with no visible tabs is dropped too. Both branches must filter — a bare
 * `return ADMIN_SECTIONS` for a clinic would leak personalOnly sections.
 */
export function visibleAdminSections(isPersonal: boolean, role?: string): AdminSection[] {
  const hideSection = (s: AdminSection) => (isPersonal ? s.clinicalOnly : s.personalOnly);
  const hideTab = (t: AdminTab) => (isPersonal ? t.clinicalOnly : t.personalOnly) || !tabAllowedFor(t, role);
  return ADMIN_SECTIONS.filter((s) => !hideSection(s))
    .map((s) => ({ ...s, tabs: s.tabs.filter((t) => !hideTab(t)) }))
    .filter((s) => s.tabs.length > 0);
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

    /**
     * A secao casa pelas **proprias abas** tambem (28/09/2026).
     *
     * Antes ela dependia so de `matchRoutes`, e isso quebrou assim que uma aba
     * mudou de secao: `/admin/education` saiu de Marketing, entrou em Clinico
     * como aba — e ninguem lembrou de mexer no `matchRoutes` da secao. Nenhuma
     * casou, caiu no fallback, e o menu passou a acender **Agenda** para a tela
     * de material do paciente.
     *
     * Uma aba com `href` e, por definicao, um caminho daquela secao. Ler isso
     * daqui mata a classe inteira do erro: acrescentar uma aba passa a bastar.
     */
    const sectionMatch =
      section.matchRoutes?.some((r) => routeMatches(clean, r)) ||
      section.tabs.some((t) =>
        [t.href, ...(t.matchRoutes || [])].some((r) => routeMatches(clean, r))
      );
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
