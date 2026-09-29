import type { TenantTypeValue } from "@/lib/tenant-type";

/**
 * O que o painel de cada tipo de inquilino mostra (102 T-2).
 *
 * O Bruno: *"a área da Clinic deles não precisa ter todas as coisas da
 * reabilitação"*. Um médico não prescreve exercício, um nutricionista não faz
 * escaneamento de pé, e um psicólogo não tem protocolo de reabilitação.
 *
 * ## Por que uma lista do que entra, e não do que sai
 *
 * `admin-sections.ts` marcava seção e aba com `clinicalOnly`/`personalOnly` —
 * 38 marcas para dois tipos. Com seis tipos isso viraria quatro marcas novas em
 * cada uma das 38, e **a que faltasse mostraria a tela errada a quem não devia
 * vê-la** — silenciosamente, porque esquecer uma marca é omissão, e omissão
 * aqui quer dizer "mostra".
 *
 * Então o profissional externo declara **o que vê**, e não o que não vê. Uma
 * seção nova nasce invisível para ele até alguém a listar aqui — que é o erro
 * barato ("faltou uma tela") em vez do caro ("o médico viu o prontuário de
 * reabilitação").
 *
 * A clínica e o estúdio **não entram neste mapa**: eles continuam exatamente
 * como estavam, pelos dois booleanos de sempre. Nada muda para quem já usa o
 * sistema.
 */

export interface PainelDoTipo {
  /** As seções que este tipo vê, pela chave em `ADMIN_SECTIONS`. */
  secoes: string[];
  /**
   * Dentro de uma seção, quais abas.
   *
   * Sem entrada aqui, a seção vem **inteira**. É o caso de "Agenda": um médico
   * usa a agenda toda. Já "Clínico" é a seção onde mora a reabilitação, e aí a
   * lista é obrigatória.
   */
  abas?: Record<string, string[]>;
}

/**
 * O núcleo que todo profissional externo tem: a agenda, os pacientes dele, o
 * que ele escreve, o dinheiro dele, e a própria conta.
 */
const NUCLEO_DO_PROFISSIONAL: PainelDoTipo = {
  secoes: ["agenda", "patients", "clinical", "finance", "settings"],
  abas: {
    /**
     * A agenda inteira — mas **escrita**, e não herdada.
     *
     * Um médico usa a agenda toda, então a lista parece redundante. Ela não é:
     * sem ela, uma aba nova de agenda nasce visível para ele, e omissão aqui
     * volta a significar "mostra". Escrever é o preço de a regra ser uma só.
     */
    agenda: [
      "today",
      "week",
      "calendar",
      "availability",
      "calls",
      "video-consultations",
      "waitlist",
    ],
    /**
     * De "Clínico", só as notas e os exames.
     *
     * Tudo o mais nessa seção é reabilitação — protocolos, exercícios,
     * escaneamento de pés, modelos 3D, agente de reabilitação. Um médico
     * abrindo a prescrição de exercício de um paciente é exatamente o que a
     * partilha item a item (T-9) existe para impedir.
     */
    clinical: ["notes", "labs", "patient-documents"],
    /**
     * De "Pacientes", a lista e as tarefas. Sem triagem, sem jornada, sem
     * questionário: são instrumentos da reabilitação.
     */
    patients: ["list", "tasks"],
    /**
     * De "Financeiro", **o dinheiro dele** — e nada da BPR.
     *
     * Achado no code review da T-2: sem esta lista, o médico via
     * `memberships` e `marketplace`, que são os planos e a loja **da
     * plataforma**. Ele estaria mexendo no catálogo de quem o intermedia.
     */
    finance: ["overview", "pricing"],
    /**
     * De "Configurações", a própria marca e a própria equipe.
     *
     * Mesmo achado: sem a lista vinham `command-center`, `study`,
     * `cpd-courses`, `my-education` e `ai-coworker` — todas telas internas da
     * BPR, que entraram no menu na triagem de 28/09 e não são de ninguém de
     * fora.
     */
    settings: ["general", "branding", "users"],
  },
};

export const PAINEL_POR_TIPO: Partial<Record<TenantTypeValue, PainelDoTipo>> = {
  DOCTOR: NUCLEO_DO_PROFISSIONAL,
  PSYCHOLOGIST: {
    ...NUCLEO_DO_PROFISSIONAL,
    abas: {
      ...NUCLEO_DO_PROFISSIONAL.abas,
      /**
       * O psicólogo não recebe exame por padrão, e não guarda documento de
       * exame: a nota de sessão é o registro dele, e ela tem tratamento
       * próprio na T-9.
       */
      clinical: ["notes"],
    },
  },
  NUTRITIONIST: {
    ...NUCLEO_DO_PROFISSIONAL,
    // A seção de nutrição é a ferramenta dele — é a única que ganha uma
    // seção inteira a mais.
    secoes: [...NUCLEO_DO_PROFISSIONAL.secoes, "nutrition"],
    abas: { ...NUCLEO_DO_PROFISSIONAL.abas, nutrition: ["food-catalog"] },
  },
  OTHER_PROFESSIONAL: NUCLEO_DO_PROFISSIONAL,
};

/** Este tipo declara o próprio painel, ou segue a regra antiga? */
export function temPainelProprio(type: string | null | undefined): boolean {
  return !!PAINEL_POR_TIPO[type as TenantTypeValue];
}

/** A seção entra no painel deste tipo? */
export function secaoVisivelNoTipo(type: string | null | undefined, secao: string): boolean {
  const painel = PAINEL_POR_TIPO[type as TenantTypeValue];
  if (!painel) return true; // clínica e estúdio: quem decide são os booleanos
  return painel.secoes.includes(secao);
}

/**
 * A aba entra na seção, para este tipo?
 *
 * Sem lista para a seção, a seção vem inteira — é o caso da agenda.
 */
export function abaVisivelNoTipo(
  type: string | null | undefined,
  secao: string,
  aba: string
): boolean {
  const painel = PAINEL_POR_TIPO[type as TenantTypeValue];
  if (!painel) return true;
  if (!painel.secoes.includes(secao)) return false;
  const lista = painel.abas?.[secao];
  return lista ? lista.includes(aba) : true;
}

/**
 * A rota de cada aba do painel, para o portão do servidor.
 *
 * ## Por que esta lista existe, sendo que `ADMIN_SECTIONS` já as tem
 *
 * O `middleware.ts` roda antes da rota e é onde o portão precisa estar —
 * esconder aba não é fechar porta. Mas `admin-sections.ts` importa ícones do
 * `lucide-react`, e arrastar isso para o middleware é caro e frágil.
 *
 * Então o dado mora aqui, puro e **gerado a partir dos `href` de verdade**.
 * Duas listas divergem, e por isso existe um teste que confronta esta com
 * `ADMIN_SECTIONS` e falha quando alguém acrescenta uma tela e esquece daqui.
 * A duplicação é aceitável porque a divergência é barulhenta.
 *
 * ## Por que aba, e não seção
 *
 * A primeira versão guardava só a seção, e o médico passava em
 * `/admin/exercises` — ele **tem** a seção "Clínico", porque é onde ficam as
 * notas dele. A reabilitação inteira mora na mesma seção, então o portão só
 * fecha na granularidade da aba. O teste pegou isto.
 */
export const ROTA_PARA_ABA: Record<string, { secao: string; aba: string }> = {
  "/admin/achievements": { secao: "patients", aba: "journey" },
  "/admin/agent-keys": { secao: "settings", aba: "agent-keys" },
  "/admin/ai-coworker": { secao: "settings", aba: "ai-coworker" },
  "/admin/ai-settings": { secao: "settings", aba: "ai" },
  "/admin/alerts": { secao: "notifications", aba: "alerts" },
  "/admin/analytics": { secao: "marketing", aba: "analytics" },
  "/admin/app-usage": { secao: "patients", aba: "app-usage" },
  "/admin/appointments": { secao: "agenda", aba: "week" },
  "/admin/appointments/availability": { secao: "agenda", aba: "availability" },
  "/admin/articles": { secao: "marketing", aba: "articles" },
  "/admin/automation": { secao: "notifications", aba: "automation-rules" },
  "/admin/biohacking": { secao: "clinical", aba: "biohacking" },
  "/admin/body-models": { secao: "clinical", aba: "body-models" },
  "/admin/calls": { secao: "agenda", aba: "calls" },
  "/admin/challenges": { secao: "challenges", aba: "challenges-list" },
  "/admin/clinical-ai": { secao: "clinical", aba: "clinical-ai" },
  "/admin/clinical-notes": { secao: "clinical", aba: "notes" },
  "/admin/clinical/rehab": { secao: "clinical", aba: "rehab-agent" },
  "/admin/clinics": { secao: "settings", aba: "clinics" },
  "/admin/command-center": { secao: "settings", aba: "command-center" },
  "/admin/conditions": { secao: "patients", aba: "journey" },
  "/admin/coupons": { secao: "finance", aba: "coupons" },
  "/admin/cpd-courses": { secao: "settings", aba: "cpd-courses" },
  "/admin/documents": { secao: "clinical", aba: "patient-documents" },
  "/admin/education": { secao: "education", aba: "education-library" },
  "/admin/education/assignments": { secao: "education", aba: "education-assignments" },
  "/admin/education/categories": { secao: "education", aba: "education-categories" },
  "/admin/education/create": { secao: "education", aba: "education-create" },
  "/admin/email": { secao: "marketing", aba: "email" },
  "/admin/email-marketing": { secao: "marketing", aba: "email-marketing" },
  "/admin/email-templates": { secao: "marketing", aba: "email" },
  "/admin/email-test": { secao: "settings", aba: "email-test" },
  "/admin/equipment": { secao: "clinical", aba: "equipment" },
  "/admin/exercise-submissions": { secao: "patients", aba: "submissions" },
  "/admin/exercises": { secao: "clinical", aba: "exercises" },
  "/admin/finance": { secao: "finance", aba: "overview" },
  "/admin/foot-scans": { secao: "clinical", aba: "foot-scans" },
  "/admin/global-dashboard": { secao: "settings", aba: "global-dashboard" },
  "/admin/journey": { secao: "patients", aba: "journey" },
  "/admin/labs": { secao: "clinical", aba: "labs" },
  "/admin/login": { secao: "settings", aba: "admin-login-legacy" },
  "/admin/marketing": { secao: "marketing", aba: "materials" },
  "/admin/marketing/articles": { secao: "marketing", aba: "articles" },
  "/admin/marketing/book": { secao: "marketing", aba: "book" },
  "/admin/marketing/condition-pages": { secao: "marketing", aba: "condition-pages" },
  "/admin/marketing/content-calendar": { secao: "marketing", aba: "calendar" },
  "/admin/marketing/ebooks": { secao: "marketing", aba: "materials" },
  "/admin/marketing/feedback": { secao: "marketing", aba: "materials" },
  "/admin/marketing/flyers": { secao: "marketing", aba: "materials" },
  "/admin/marketing/instagram": { secao: "marketing", aba: "instagram" },
  "/admin/marketing/instagram-connect": { secao: "marketing", aba: "instagram" },
  "/admin/marketing/instagram-dashboard": { secao: "marketing", aba: "instagram" },
  "/admin/marketing/instagram-studio": { secao: "marketing", aba: "instagram" },
  "/admin/marketing/leads": { secao: "marketing", aba: "leads" },
  "/admin/marketplace": { secao: "finance", aba: "marketplace" },
  "/admin/measurements": { secao: "clinical", aba: "biohacking" },
  "/admin/measurements/inbox": { secao: "patients", aba: "measurements" },
  "/admin/memberships": { secao: "finance", aba: "memberships" },
  "/admin/my-education": { secao: "settings", aba: "my-education" },
  "/admin/notifications": { secao: "notifications", aba: "broadcast" },
  "/admin/nutrition": { secao: "nutrition", aba: "food-catalog" },
  "/admin/outbox": { secao: "notifications", aba: "outbox" },
  "/admin/patient-portal": { secao: "patients", aba: "portal" },
  "/admin/patient-tasks": { secao: "patients", aba: "tasks" },
  "/admin/patients": { secao: "patients", aba: "list" },
  "/admin/protocols": { secao: "clinical", aba: "protocols" },
  "/admin/quizzes": { secao: "patients", aba: "journey" },
  "/admin/reminder-templates": { secao: "notifications", aba: "reminder-templates" },
  "/admin/sales": { secao: "marketing", aba: "sales" },
  "/admin/scans": { secao: "clinical", aba: "scans" },
  "/admin/scans/report-preview": { secao: "clinical", aba: "scans" },
  "/admin/screening-preview": { secao: "patients", aba: "screening" },
  "/admin/security": { secao: "settings", aba: "security" },
  "/admin/service-pages": { secao: "settings", aba: "general" },
  "/admin/service-pricing": { secao: "finance", aba: "pricing" },
  "/admin/settings": { secao: "settings", aba: "general" },
  "/admin/studio-branding": { secao: "settings", aba: "branding" },
  "/admin/study": { secao: "settings", aba: "study" },
  "/admin/system-logs": { secao: "settings", aba: "logs" },
  "/admin/training-programs": { secao: "clinical", aba: "programs" },
  "/admin/treatment-plans": { secao: "clinical", aba: "treatments" },
  "/admin/treatment-types": { secao: "clinical", aba: "treatments" },
  "/admin/treatments": { secao: "clinical", aba: "treatments-legacy" },
  "/admin/users": { secao: "settings", aba: "users" },
  "/admin/video-consultations": { secao: "agenda", aba: "video-consultations" },
  "/admin/voice-costs": { secao: "settings", aba: "voice-costs" },
  "/admin/waitlist": { secao: "agenda", aba: "waitlist" },
};

/** A seção e a aba a que este caminho pertence, ou `null` quando é de nenhuma. */
export function abaDaRota(pathname: string): { secao: string; aba: string } | null {
  // O caminho da API espelha o da tela: `/api/admin/labs` é a aba de exames.
  const limpo = pathname.startsWith("/api") ? pathname.slice(4) : pathname;
  let melhor: { secao: string; aba: string; tamanho: number } | null = null;
  for (const [rota, destino] of Object.entries(ROTA_PARA_ABA)) {
    // Mais específica ganha, pela mesma razão de `abaMaisEspecifica`:
    // `/admin/treatment-types` não pode casar por `/admin/treatments`.
    if ((limpo === rota || limpo.startsWith(rota + "/")) && (!melhor || rota.length > melhor.tamanho)) {
      melhor = { ...destino, tamanho: rota.length };
    }
  }
  return melhor ? { secao: melhor.secao, aba: melhor.aba } : null;
}

/**
 * Este inquilino pode abrir este caminho?
 *
 * **Só decide para quem tem painel próprio.** Para a clínica e o estúdio
 * devolve `true` sempre — quem os governa são os booleanos e
 * `isPersonalBlockedRoute`, que já existiam e não mudam.
 *
 * Caminho de nenhuma aba também passa: o portão recusa o que ele conhece e não
 * é do tipo, e não tudo o que ele não reconhece — senão a primeira tela nova
 * fecharia o painel inteiro.
 */
export function rotaPermitidaNoTipo(type: string | null | undefined, pathname: string): boolean {
  if (!temPainelProprio(type)) return true;
  const destino = abaDaRota(pathname);
  if (!destino) return true;
  return abaVisivelNoTipo(type, destino.secao, destino.aba);
}
