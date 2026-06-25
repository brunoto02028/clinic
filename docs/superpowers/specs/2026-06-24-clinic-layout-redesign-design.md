# Redesign do Layout da Clinica - Design Spec

**Data:** 06/24/2026
**Status:** Aprovado
**Foco:** Web first (mobile vem depois, branch New-Mobile)

---

## Objetivo

Reestruturar a navegacao e o layout dos paineis admin e paciente, transformando 60+ paginas desorganizadas em uma estrutura clara com 6 secoes cada. Manter cores e tema visual existentes.

## Principios de Design

1. **Simplicidade** - Menos opcoes visiveis, mais organizacao interna via tabs
2. **Clareza por papel** - Admin = power-user (sidebar colapsavel), Paciente = usuario casual (sidebar fixa com labels)
3. **Consistencia** - Mesma linguagem visual entre paineis, diferenca apenas em complexidade
4. **1 clique** - Qualquer secao principal acessivel em 1 clique na sidebar

## Tema Visual (mantido)

- **Background:** Dark teal (#0a1a1f)
- **Primary:** Teal (#4a7c8a)
- **Accent:** Turquoise (#5dc9c0)
- **Cards:** Glass-morphism com backdrop blur
- **Efeitos:** Neon cyan/emerald para estados ativos
- **Icones:** Lucide React
- **Dark mode:** Padrao (class-based)

---

## Painel Admin

### Navegacao: Mini-sidebar + Tabs

**Sidebar:**
- Largura colapsada: 60px (apenas icones)
- Largura expandida: 180px (icone + label), expande no hover
- 6 itens fixos + logo no topo
- Config isolado no rodape da sidebar
- Active state: background rgba(93,201,192,0.15)

**Tabs contextuais:**
- Aparecem no topo da area de conteudo, abaixo do header
- Mudam conforme a secao selecionada na sidebar
- Tab ativa: cor #5dc9c0 + border-bottom 2px solid

### Estrutura de Secoes e Tabs

#### 1. Agenda (icone: Calendar)
| Tab | Conteudo | Paginas atuais mapeadas |
|-----|----------|------------------------|
| Hoje | Lista de consultas do dia, stats rapidos | `/admin` (dashboard), `/admin/appointments` |
| Semana | Visao semanal da agenda | `/admin/appointments` |
| Calendario | Calendario mensal completo | `/admin/appointments` |
| Disponibilidade | Config de horarios dos terapeutas | `/admin/appointments/availability` |

Inclui tambem: video-consultations, calls (AI receptionist) como sub-funcionalidades dentro das consultas.

#### 2. Pacientes (icone: Users)
| Tab | Conteudo | Paginas atuais mapeadas |
|-----|----------|------------------------|
| Lista | Tabela de pacientes com busca/filtro | `/admin/patients` |
| Triagem | Screening/intake config e preview | `/admin/screening-preview` |
| Tarefas | Tarefas atribuidas a pacientes | `/admin/patient-tasks` |
| Portal | Config do portal do paciente | `/admin/patient-portal` |

Perfil individual do paciente (`/admin/patients/[id]`) abre como sub-pagina a partir da lista, mantendo as 5 tabs internas ja existentes (perfil, diagnostico, documentos, permissoes).

#### 3. Clinico (icone: Stethoscope)
| Tab | Conteudo | Paginas atuais mapeadas |
|-----|----------|------------------------|
| Notas SOAP | Notas clinicas e full assessments | `/admin/clinical-notes` |
| Foot Scans | Lista de scans, 3D viewer, comparacao, insoles | `/admin/foot-scans`, `/admin/foot-scans/[id]`, `/admin/foot-scans/[id]/insoles`, `/admin/foot-scans/new` |
| Body Assessment | Avaliacao postural, composicao corporal | `/admin/body-assessments`, `/admin/body-models` |
| Tratamentos | Planos de tratamento, treatment types | `/admin/treatment-plans`, `/admin/treatment-types` |
| Exercicios | Biblioteca de exercicios | `/admin/exercises` |
| Biohacking | Performance e biohacking | `/admin/biohacking`, `/admin/blood-pressure` |

Inclui: clinical-ai como funcionalidade transversal (assistente AI dentro de notas e scans).

#### 4. Marketing (icone: Megaphone)
| Tab | Conteudo | Paginas atuais mapeadas |
|-----|----------|------------------------|
| Instagram | Studio, posts, dashboard, connect | `/admin/marketing/instagram`, `/admin/marketing/instagram-studio`, `/admin/marketing/instagram-dashboard`, `/admin/marketing/instagram-connect` |
| Artigos | Blog, SEO articles | `/admin/articles`, `/admin/articles/new`, `/admin/articles/[id]`, `/admin/marketing/articles` |
| Calendario | Content calendar e planejamento | `/admin/marketing/content-calendar` |
| Email | Templates, campaigns, email marketing | `/admin/email`, `/admin/email-templates`, `/admin/email-marketing` |
| Educacao | Content library, create, categories, assignments | `/admin/education`, `/admin/education/create`, `/admin/education/categories`, `/admin/education/assignments` |
| Materiais | Flyers, business cards, ebooks, feedback | `/admin/marketing/flyers`, `/admin/marketing/business-cards`, `/admin/marketing/ebooks`, `/admin/marketing/feedback` |

Inclui: social campaigns, content intelligence, sales pipeline como sub-funcionalidades.

#### 5. Financeiro (icone: DollarSign)
| Tab | Conteudo | Paginas atuais mapeadas |
|-----|----------|------------------------|
| Resumo | Relatorios financeiros, receita | `/admin/finance` |
| Precos | Service pricing | `/admin/service-pricing` |
| Memberships | Planos e beneficios | `/admin/memberships` |
| Marketplace | Produtos, pedidos, PDF creator | `/admin/marketplace`, `/admin/marketplace/orders`, `/admin/marketplace/pdf-creator` |

Inclui: stripe branding, cancellations como config dentro de cada contexto.

#### 6. Configuracoes (icone: Settings) - rodape da sidebar
| Tab | Conteudo | Paginas atuais mapeadas |
|-----|----------|------------------------|
| Geral | Site settings (branding, contato, social, footer, servicos) | `/admin/settings` |
| Usuarios | Staff management | `/admin/users` |
| Clinicas | Multi-tenant management (SuperAdmin) | `/admin/clinics` |
| AI | OpenAI, Claude config, AI coworker | `/admin/ai-settings`, `/admin/ai-coworker` |
| Seguranca | SSL, cybersecurity, agent keys | `/admin/security`, `/admin/agent-keys` |
| Logs | System logs, voice costs, analytics | `/admin/system-logs`, `/admin/voice-costs`, `/admin/analytics` |

Inclui: journey/gamification config (quizzes, achievements, conditions) dentro da tab Portal em Pacientes (faz mais sentido semanticamente, pois gamification e voltada ao paciente).

### Header do Admin
- Titulo da secao atual (esquerda)
- Busca global de paciente (centro/direita)
- Notificacoes (sino com badge)
- Avatar do usuario (iniciais)
- Clinic selector (se multi-tenant)

---

## Painel do Paciente

### Navegacao: Sidebar Fixa com Labels

**Sidebar:**
- Largura fixa: 200px (nunca colapsa)
- Icone + texto sempre visiveis
- Labels em linguagem humana (nao tecnica)
- 5 itens principais + Perfil separado no rodape
- Active state: background rgba(93,201,192,0.12) + cor #5dc9c0 + font-weight 600
- Logo da clinica + nome do paciente no topo

### Estrutura de Secoes

#### 1. Inicio (icone: Home)
- Dashboard com saudacao personalizada
- Card de proxima consulta (destaque)
- Stats de progresso (consultas, scans, exercicios)
- Acoes rapidas contextuais (completar triagem, agendar consulta, etc.)
- Atividade recente (timeline)
- Notificacoes pendentes

Paginas atuais: `/dashboard`

#### 2. Consultas (icone: Calendar)
Sub-paginas internas (via tabs ou lista):
- Agendar nova consulta
- Minhas consultas (proximas + historico)
- Triagem/Screening (se pendente, destaque com badge)
- Consentimento

Paginas atuais: `/dashboard/appointments`, `/dashboard/appointments/book`, `/dashboard/appointments/[id]`, `/dashboard/screening`, `/dashboard/consent`

#### 3. Minha Saude (icone: Stethoscope)
Sub-paginas internas:
- Notas clinicas (visualizacao)
- Foot Scans (resultados, 3D viewer)
- Body Assessment (postural, composicao)
- Plano de tratamento ativo
- Blood pressure / Biohacking
- Documentos medicos
- Outcome measures

Paginas atuais: `/dashboard/clinical-notes`, `/dashboard/scans`, `/dashboard/body-assessments`, `/dashboard/treatment`, `/dashboard/plans`, `/dashboard/blood-pressure`, `/dashboard/biohacking`, `/dashboard/documents`, `/dashboard/records`, `/dashboard/outcome-measures`, `/dashboard/follow-up`

#### 4. Exercicios (icone: Dumbbell)
Sub-paginas internas:
- Meus exercicios (com video, reps, tracking)
- Tarefas atribuidas
- Jornada / Conquistas (gamification)
- Quizzes

Paginas atuais: `/dashboard/exercises`, `/dashboard/tasks`, `/dashboard/journey`, `/dashboard/achievements`, `/dashboard/quizzes`, `/dashboard/quiz`

#### 5. Aprender (icone: BookOpen)
Sub-paginas internas:
- Conteudo educacional (artigos, videos, infograficos)
- Guias (insole guide, patient guide)
- Comunidade (se habilitado)

Paginas atuais: `/dashboard/education`, `/dashboard/guide`, `/dashboard/insole-guide`, `/dashboard/community`

#### 6. Meu Perfil (icone: User) - rodape da sidebar
Sub-paginas internas:
- Dados pessoais (nome, email, telefone, endereco)
- Membership (plano ativo, beneficios)
- Marketplace (compras)
- Gravacoes
- Preferencias (idioma, comunicacao)
- Alterar senha

Paginas atuais: `/dashboard/profile`, `/dashboard/membership`, `/dashboard/marketplace`, `/dashboard/recordings`

### Header do Paciente
- Saudacao + nome (esquerda)
- Notificacoes com badge (direita)

---

## Paginas que NAO mudam de estrutura

- **Paginas publicas** (landing, login, signup, artigos, servicos, shop) - fora do escopo deste redesign
- **Paginas de auth** (login, forgot-password, reset-password, verify) - mantidas
- **Paginas de intake/forms** (/intake/[token], /scan/[token], /capture/[token]) - mantidas
- **Perfil individual do paciente no admin** (`/admin/patients/[id]`) - mantem as 5 tabs internas ja refatoradas

---

## Comportamentos de Navegacao

### Admin
1. Ao clicar num icone da sidebar, area principal carrega a secao com suas tabs
2. Primeira tab e sempre a default (ex: "Hoje" na Agenda)
3. Sub-paginas (ex: editar scan, perfil paciente) abrem mantendo a sidebar e tabs visiveis, com breadcrumb
4. Sidebar expande no hover: usa position absolute/overlay sobre o conteudo para nao causar layout shift. Transicao via transform: translateX + opacity nos labels
5. Em telas < 1024px, sidebar vira drawer (hamburger menu)

### Paciente
1. Sidebar fixa, sempre visivel em desktop (>= 768px)
2. Em telas < 768px, sidebar vira bottom sheet ou drawer
3. Sub-paginas dentro de cada secao usam tabs ou navegacao interna com back button
4. Acoes rapidas no dashboard direcionam para a secao correta

---

## Componentes Reutilizados

- **Cards** (stat-card, highlight-card, action-card) - ja existem no design system
- **Badges** (status: confirmada, pendente, cancelada) - ja existem
- **Tabs** (Radix UI Tabs) - ja implementado
- **Dialog/Drawer** (Radix UI) - ja implementado
- **Lista de items** - padronizar um componente unico
- **Busca global** - novo componente (Command palette com cmdk)

## Componentes Novos Necessarios

1. **AdminMiniSidebar** - Substitui o AdminSidebar atual, com comportamento expand-on-hover
2. **PatientSidebar** - Substitui o DashboardLayout sidebar, fixa com labels
3. **SectionTabs** - Componente wrapper que mapeia secao da sidebar para tabs corretas
4. **GlobalSearch** - Command palette (Cmd+K) para busca rapida de pacientes/funcoes

---

## Decisoes Tecnicas

- **Rotas**: Manter a estrutura de rotas existente do Next.js App Router. A reorganizacao e visual (sidebar + tabs), nao de URL.
- **State**: Tab ativa e secao ativa gerenciados via URL search params (ex: `?tab=hoje`) para deep-linking
- **Permissoes**: Manter o sistema atual de role-based filtering na sidebar
- **i18n**: Manter suporte PT-BR / EN-GB. Labels da sidebar do paciente precisam de traducao ("Minha Saude" / "My Health")
- **Tema**: Manter CSS variables existentes e design tokens
