---
description: Project vault with all access credentials and infrastructure info for bpr.rehab
---

# BPR Clinic — Project Vault & SPEC Completa

> **⚠️ SENSITIVE — não partilhar publicamente**
> Última actualização: 30 Julho 2026 — Migração de infraestrutura Render → Coolify (web + database)

---

## 🌐 URLs

| Item | URL |
|---|---|
| **Site público** | https://bpr.rehab |
| **Coolify URL (interna)** | https://clinic.c.baintelligence.co.uk |
| **Admin** | https://bpr.rehab/admin |
| **Coolify Dashboard** | painel Coolify → `BAIntelligence` → `production` → app `clinic` |
| **GitHub** | https://github.com/brunoto02028/clinic |
| **Local dev** | http://localhost:3000 |

---

## 🔐 Admin Login

| Campo | Valor |
|---|---|
| **Email** | admin@bpr.rehab |
| **Password** | ⚠️ REMOVIDO — ver gestor de senhas (rotacionada em 28 Jul 2026 após exposição pública) |
| **Role** | SUPERADMIN |
| **Login URL (local)** | http://localhost:3000/staff-login |
| **Login URL (prod)** | https://bpr.rehab/staff-login |

---

## 🏗️ Infraestrutura (Coolify)

| Componente | Detalhes |
|---|---|
| **Provedor** | Coolify (self-hosted) |
| **Team** | `BA TEAM` |
| **Projeto** | `BAIntelligence` → environment `production` |
| **App** | `clinic` |
| **Build Pack** | Dockerfile |
| **Database** | PostgreSQL gerido pelo Coolify (ver env vars da app no painel para a `DATABASE_URL` actual) |
| **DB name** | `bpr_clinic` |

### Deploy flow
```bash
git add -A && git commit -m "feat: descrição"
git push origin main    # Coolify auto-deploya via webhook do GitHub
```
- `start.sh` corre `prisma db push --skip-generate` no arranque (idempotente)
- Nunca commitar: `.env`, `*.sql`, `backup_*.sql`

### ⚠️ Railway — BANIDA PERMANENTEMENTE (Jun 2026)
- NÃO usar Railway para nada. Old DB: `interchange.proxy.rlwy.net:49611` — MORTA.

---

## 🌍 DNS (Hostinger)

DNS aponta para o Coolify (ver painel Coolify → app `clinic` → **Domains** para os valores actuais
de `bpr.rehab` / `www.bpr.rehab`).

---

## 🤖 AI Stack — Arquitectura (Jul 2026)

### Princípio: OpenRouter First
**`OPENROUTER_API_KEY` configurada → TODA a geração de texto usa Claude Sonnet 5 via OpenRouter.**
Fallback só activo se OpenRouter não estiver disponível.

### Routing de texto (lib/ai-provider.ts)
```
callAI() / callAIChat()
  └── OPENROUTER_API_KEY set? → claudeGenerate() → claude-sonnet-5 via OpenRouter ✅
      └── (fallback sem key) → Minimax M3 → Groq llama-3.3-70b → Gemini 2.5-flash
```

### Por funcionalidade
| Funcionalidade | Modelo | Provider |
|---|---|---|
| AI Article Assistant | claude-sonnet-5 | OpenRouter |
| AI Co-Worker (admin) | claude-sonnet-5 | OpenRouter |
| Study Assistant (tutor) | claude-sonnet-5 | OpenRouter |
| Clinical Scribe / SOAP | claude-sonnet-5 | OpenRouter |
| Marketing Generator | claude-sonnet-5 | OpenRouter |
| Patient AI Coach | claude-sonnet-5 | OpenRouter |
| Diagnóstico / Protocolo | claude-sonnet-5 | OpenRouter |
| Geração de imagens | gemini-2.5-flash-preview-image-generation | Gemini |
| Visão / análise fotos | MiniMax-M3 Vision → Gemini fallback | Minimax |
| Transcrição voz | Minimax speech-01-hd → Groq Whisper | Minimax/Groq |
| Vapi "Amy" (receptionist) | MiniMax-M3 via proxy | MiniMax (latência crítica) |

### Ficheiros-chave
- `lib/claude.ts` — gateway Claude/OpenRouter, `claudeGenerate()`, `claudeStream()`
- `lib/ai-provider.ts` — hub central; exporta `CLAUDE_SONNET_MODEL = 'claude-sonnet'`
- `lib/ai-coworker.ts` — AI Co-Worker usa `claudeGenerate` directamente
- `lib/gemini.ts` — Gemini text + `generateImageGemini()`

### lib/claude.ts — lógica de routing
```typescript
USE_OPENROUTER = Boolean(process.env.OPENROUTER_API_KEY)
// true → 'anthropic/claude-sonnet-5' via https://openrouter.ai/api/v1/chat/completions
// false → 'claude-sonnet-4-20250514' via https://api.anthropic.com/v1/messages
```

---

## 🔑 API Keys (todas activas no Coolify + .env local)

| Serviço | Variável env | Status Coolify | Notas |
|---|---|---|---|
| **OpenRouter** | `OPENROUTER_API_KEY` | ✅ SET | PRIMARY para todo texto |
| **Anthropic** | `ANTHROPIC_API_KEY` | ✅ SET | Fallback se sem OpenRouter |
| **MiniMax** | `MINIMAX_API_KEY` | ✅ SET | voz + visão |
| **Groq** | `GROQ_API_KEY` | ✅ SET | fallback texto/whisper |
| **Hugging Face** | `HUGGINGFACE_API_KEY` | ✅ SET | |
| **Google Gemini** | `GEMINI_API_KEY` | ✅ Na DB | Admin → Settings → AI → Gemini API Key |
| **Google OAuth** | `GOOGLE_CLIENT_ID/SECRET` | ✅ SET | Login Google |
| **Vapi** | `VAPI_API_KEY` | ✅ SET | |
| **Vapi Public** | `VAPI_PUBLIC_KEY` | ✅ SET | |
| **Vapi Assistant** | `VAPI_ASSISTANT_ID` | ✅ SET | (Amy) |
| **Vapi Phone** | `VAPI_PHONE_NUMBER_ID` | ✅ SET | (US test +18392789516) |

> Valores reais de todas as keys: ver `.env` local (gitignored) ou Coolify → Environment Variables. **Nunca colar valores aqui — este ficheiro vai para o GitHub público.**

### Auth
| Variável | Valor |
|---|---|
| `NEXTAUTH_URL` | `https://bpr.rehab` |
| `NEXTAUTH_SECRET` | ver Coolify (⚠️ rotacionar — esteve exposta neste ficheiro) |

---

## 📁 Projecto Local (Mac)

| Item | Valor |
|---|---|
| **Path** | `/Users/brunotoaz/Downloads/DESENVOLVIMENTO/Bruno/Widsurf/clinic` |
| **Branch local** | `Feat/New-Mobile` (push para `main` com `git push origin HEAD:main`) |
| **DB local** | PostgreSQL nativo macOS `postgresql://brunotoaz@localhost:5432/bpr_clinic_local` |

---

## 🧩 Features implementadas (cronologia)

### Estrutura base
- Next.js 14 App Router + TypeScript + Prisma + PostgreSQL
- Auth: NextAuth (email/password + Google OAuth)
- Roles: `PATIENT`, `STAFF`, `ADMIN`, `SUPERADMIN`
- UI: TailwindCSS + shadcn/ui + Lucide

### Módulos admin
- **Agenda** — `/admin/schedule` — gestão de consultas + disponibilidade
- **Pacientes** — `/admin/patients` — prontuário completo, histórico, diagnóstico AI
- **Clinical Scribe** — gravação consulta → SOAP note AI
- **Body Assessments** — avaliação postural + fotos + AI analysis
- **Foot Scans** — scan digital do pé + ortóticas
- **Marketing** — artigos bilíngues EN/PT, Instagram, flyers, cartões, email
- **AI Co-Worker** — assistente contextual Admin (Claude Sonnet 5)
- **Study Assistant** — tutor AI para diploma Level 5 Sports Therapy
- **Biohacking Admin** — protocolos HRV/sono/performance + Terra API
- **Clinical Rehab Agent «Atlas»** — `/admin/clinical/rehab` + tab em cada paciente — pré-avaliação interrogativa + plano multifásico + chat
- **Settings** — system config, AI keys, geração de imagens

### Módulos paciente (dashboard)
- Booking de consultas
- Progresso / journey
- AI Coach
- Daily check-in
- Body assessment capture (token-based, mobile-friendly)
- Biohacking — `/dashboard/biohacking`

### Páginas públicas
- Landing page (`/`) — serviços, testemunhos, insoles, biohacking
- Serviços (`/services/[slug]`) — páginas individuais
- Biohacking (`/biohacking`) — página dedicada dark-hero violet
- Artigos (`/articles`) — bilíngue EN/PT
- Custom insoles (`/custom-insoles`)
- Biomechanical assessment (`/biomechanical-assessment`)
- App (`/get-the-app`)

### AI Article Assistant (Marketing → Articles)
- Chat conversacional em qualquer idioma
- Gera artigos em EN-GB / EN-US / PT-BR / PT-PT
- Sistema de prompt: voz Bruno, referências PubMed, HTML formatado
- `callAIChat(..., { model: CLAUDE_SONNET_MODEL })` → Claude Sonnet 5 via OpenRouter
- Cover image: `generateImageSmart()` → Gemini imagem

### Biohacking (Jul 2026)
- Serviços: `biohacking-performance`, `hrv-recovery-monitoring`, `sleep-longevity-optimisation`
- Página `/biohacking` com hero dark, 3 pilares, protocolos, CTA
- Terra API integration: wearable data (Whoop, Garmin, etc.)
- Prisma models: `BiohackingProtocol`, `BiohackingAssignment`, `TerraWebhookEvent`

### Study Assistant (Jun 2026)
- Para Diploma Level 5 Sports Therapy (Core Elements, Swindon)
- Prisma: `StudyProject`, `StudyDocument`, `StudyMessage`, `StudyDraft`
- Modos: Tutor (UK Level 5 academic) + English Coach
- Upload de PDFs → extracção de texto → injecção no contexto
- Export: Word / PDF / copy

### Vapi "Amy" — Receptionist AI
- Número US: +1 839 278 9516
- Modelo: MiniMax-M3 via proxy `/api/vapi/minimax-proxy`
- Voz: ElevenLabs Rachel
- Transcrição: Deepgram nova-2 en-GB
- Ferramentas: `checkAvailability`, `bookAppointment`

### Artigos bilíngues
- Campos: `titleEn/excerptEn/contentEn` + `titlePt/excerptPt/contentPt`
- `publishLanguage` — idioma primário para SEO e slug
- Toggle público EN/PT via `useLocale` (client-side, sem hydration mismatch)

### Clinical Rehab Agent «Atlas» (2 Jul 2026)
- Agente AI especialista em 6 áreas: **Joelho · Tornozelo · Anca · Ombro · Coluna · Músculo**
- Persona humanizada: nome **Atlas**, foto humana, Clinical Rehabilitation Specialist
- **Avatar:** `https://randomuser.me/api/portraits/men/52.jpg`
- Modelo: `claude-sonnet-5` via OpenRouter (temperatura 0.3 para precisão clínica)
- **Fluxo:** Pre-assessment chat (Atlas interroga primeiro) → geração de plano JSON → chat follow-up com referências
- **Só para uso interno admin** — nunca exposto ao paciente

#### Ficheiros
| Ficheiro | Função |
|---|---|
| `lib/rehab-agent.ts` | System prompt Atlas, `generateRehabPlan()`, `streamRehabPlan()`, `rehabChat()`, `preAssess()` |
| `app/api/admin/patients/[id]/rehab-plan/route.ts` | GET lista + POST gerar plano |
| `app/api/admin/patients/[id]/rehab-plan/[planId]/route.ts` | GET plano individual + PATCH status |
| `app/api/admin/patients/[id]/rehab-plan/[planId]/chat/route.ts` | POST chat follow-up com plano |
| `app/api/admin/patients/[id]/rehab-plan/pre-assess/route.ts` | POST chat pré-avaliação stateless |
| `app/api/admin/rehab-plans/recent/route.ts` | GET últimos 20 planos (página independente) |
| `app/admin/clinical/rehab/page.tsx` | Página independente: Atlas hero + 6 especialidades + search + pre-assess + plano |
| `app/admin/patients/[id]/page.tsx` | Tab «Rehab Agent» no perfil do paciente |

#### Regras clínicas do Atlas
- **NUNCA diagnostica** — apenas formula hipóteses
- Referências obrigatórias: PubMed, NICE, Cochrane, BJSM, JOSPT, JBJS, PTJ, Clinical Rehabilitation, AJSM, European Spine Journal, KSSTA
- Fontes proibidas: WebMD, NHS leaflets, Wikipedia, blogs, redes sociais
- Incorpora equipamento BPR: MLS Laser, MENS, TENS, Ultrassom, Dry Needling, Ventosas
- Interroga activamente — nunca lisonjeia
- Levanta red flags e critérios de referenciação

#### Output JSON (RehabPlanOutput)
```typescript
{
  diagnosisHypothesis: string
  differentialDiagnoses: string[]
  severity: string
  phase: string
  prognosis: string
  returnToActivityTimeline: string
  redFlags: string[]
  phases: Array<{
    phase: string; duration: string; goals: string[]
    bprTreatments: string[]
    exercises: Array<{ name; sets; reps; frequency; notes }>
    precautions: string[]
  }>
  references: string[]
}
```

#### Prisma models
```prisma
model RehabPlan {
  id              String         @id @default(cuid())
  patientId       String
  createdById     String
  chiefComplaint  String
  bodyPart        String
  severity        String
  phase           String
  planJson        Json           // RehabPlanOutput
  status          String         @default("active")
  createdAt       DateTime       @default(now())
  messages        RehabMessage[]
  @@map("rehab_plans")
}
model RehabMessage {
  id        String   @id @default(cuid())
  planId    String
  role      String   // "user" | "assistant"
  content   String   @db.Text
  createdAt DateTime @default(now())
  @@map("rehab_messages")
}
```

---

## 🗂️ Prisma DB — tabelas principais

```
users, accounts, sessions
appointments, appointment_slots
patients, patient_journeys, patient_messages
body_assessments, foot_scans, outcome_measures
articles, service_pages, testimonials
memberships, membership_plans
marketing_content
system_configs
vapi_calls
study_projects, study_documents, study_messages, study_drafts
biohacking_protocols, biohacking_assignments, terra_webhook_events
rehab_plans, rehab_messages
patient_questions  (type: questions|report, status: pending|answered|reviewed)
soap_notes
```

---

## 👤 Painel do Paciente (Admin) — Guia de Referência

### Badges / Botões de estado (faixa colorida)

| Badge / Botão | Significado | Acção |
|---|---|---|
| 🟡 **Perfil Pendente** | Paciente não completou `/dashboard/profile` (nome, tel, DOB) | Fica verde quando preenche |
| 🔴 **Sem Senha** | Admin criou conta mas paciente não registou ainda | Enviar invite link → aceitar → fica "Senha Definida" |
| 🟢 **Consentimento Aceito** | GDPR aceite em `/dashboard/consent` | Sem isto, dashboard está bloqueado |
| 🟢 **Acesso Total Ativo** *(clicável)* | Override manual: acesso completo mesmo sem screening/pagamento | Clica para ligar/desligar |
| 🟡 **Resetar Senha** *(clicável)* | Abre campo inline para admin definir nova password | Digitar + confirmar |
| 🔵 **Ver como Paciente** *(clicável)* | Impersonation — vê exactamente o que o paciente vê | Barra azul no topo; "Voltar ao Admin" para sair |

### Tabs do perfil de paciente (admin)

| Tab | Conteúdo | Editável? |
|---|---|---|
| **Resumo** | Overview: red flags, queixa principal, invite link, acções rápidas | Parcialmente |
| **Screening** | Triagem médica preenchida pelo paciente + perguntas/respostas Q&A | ✅ Admin pode editar; paciente preencheu inicialmente |
| **Avaliações** | Foot scans, body assessments, termografia | ✅ |
| **Notas Clínicas** | SOAP Notes (S/O/A/P) + Blood Pressure readings | ✅ Add/Edit/Delete |
| **Documentos** | Upload de ficheiros + Write Clinical History | ✅ |
| **Rehab Agent** | Atlas AI — chat clínico + enviar mensagens ao paciente | ✅ |

### Sistema de Mensagens ao Paciente (2 Jul 2026)

Localização no admin: **Rehab Agent tab → painel "Mensagens Enviadas ao Paciente"**

**Dois tipos distintos:**
- `type: "questions"` — Pré-atendimento: paciente responde pergunta por pergunta no portal
- `type: "report"` — Relatório/Feedback clínico: leitura apenas, sem campos de resposta

**Fluxo correcto:**
1. Conversar com Atlas → clicar "Enviar ao Paciente"
2. Dialog abre com texto completo do Atlas + auto-detecta tipo (relatório ou perguntas)
3. Confirmar → paciente recebe email + aparece em `/dashboard/questions`

**Admin pode:**
- Expandir ▼ cada item para ver conteúdo + respostas
- 🗑 Eliminar qualquer item (reflecte imediatamente no portal do paciente)
- Ver Q&A também na tab Screening (integrado com triagem)

**Paciente vê em `/dashboard/questions`:**
- Inbox organizado por dia (separador de data)
- 📋 Relatório = card verde, leitura
- ❓ Pré-Atendimento = card azul, com textareas redimensionáveis + botão Enviar
- Itens respondidos colapsados (clica para expandir)
- Badge "⏳ X pendentes" no cabeçalho

### Tarefas (Patient Action Requests) — `/admin/patient-tasks`

Pedidos de acção enviados pelo admin a pacientes específicos.

| Tipo | Descrição |
|---|---|
| Custom Message | Mensagem livre |
| Upload Document | Pedir upload de documento |
| Complete Screening | Lembrete para completar triagem |
| Record Pre-Consultation | Gravação de voz pré-consulta |
| Sign Consent | Assinar consentimento |
| Update Profile | Completar perfil |
| Confirm Appointment | Confirmar consulta |
| Pay Invoice | Pagar fatura |

Paciente recebe: email + notificação in-app → responde via `/dashboard/tasks`

### Portal do paciente — Sidebar (PATIENT_SECTIONS)

| Item sidebar | Rota | Conteúdo |
|---|---|---|
| 🏠 Início | `/dashboard` | Home page do paciente |
| 📅 Consultas | `/dashboard/appointments` | Marcações + screening + consent |
| 🩺 Minha Saúde | `/dashboard/clinical-notes` | Notas, tratamento, planos, documentos, registos |
| 💪 Exercícios | `/dashboard/exercises` | Exercícios, tarefas, journey, achievements |
| 📚 Aprender | `/dashboard/education` | Guias, insole guide, comunidade |
| ❓ Perguntas | `/dashboard/questions` | Mensagens da Clínica (Q&A + relatórios) |
| 👤 Meu Perfil | `/dashboard/profile` | Perfil, membership |

### Notas Clínicas (SOAP) — Correcções 2 Jul 2026
- Botão "+ Add" estava a renderizar no tab Resumo (invisível ao estar no tab Notas) → **corrigido**: form agora inline no tab Notas Clínicas
- Adicionado botão 🗑 Delete em cada nota (API: `action: "delete_soap_note"`)
- Botão "Exportar PDF" via `window.print()`
- **SOAP Auto-Save (3s debounce):** ao escrever numa nota SOAP, a cada 3 segundos de pausa guarda automaticamente no DB. Primeiro save cria o registo; saves seguintes actualizam o mesmo (`autoSavedNoteId`). Indicador no cabeçalho do form: "A guardar..." / "Guardado automaticamente".
- **Bugs clinicId FK corrigidos em TODOS os routes:** `PatientDocument_clinicId_fkey` e `SOAPNote_clinicId_fkey` resolvidos — cada route agora busca `patient.clinicId` como fonte primária (sessão pode ter null para admins).

### Clinical Scribe — Agente de Transcrição Longa (2 Jul 2026)

Localização: **Tab Notas Clínicas → painel violeta collapsível "Clinical Scribe"**

**Capacidades:**
- Aceita áudio ou vídeo até 500MB (MP3, MP4, WAV, M4A, WebM, OGG, FLAC, AAC, MOV...)
- Ficheiros ≤ 20MB → transcrição directa via Groq Whisper `whisper-large-v3`
- Ficheiros > 20MB → divide em chunks de 20MB, transcreve cada um, concatena (sem perder nada)
- Selector de idioma: Português / English
- Após transcrição: preview + "Inserir no SOAP" (preenche campo S + abre form) + "Copiar"

**API:** `POST /api/admin/transcribe` (multipart/form-data: `file`, `lang`)

### Email Templates (2 Jul 2026)
- Botão **"Email Templates"** adicionado no cabeçalho de Marketing > Email
- Navega para `/admin/email-templates` (antes só acessível via URL directa)

### Bulk Import de Artigos (2 Jul 2026)
- Botão **"Import All from Site"** (violeta) em Marketing > Artigos
- Fluxo: Discover → Lista com checkboxes → Import todos em bulk
- API: `POST /api/admin/articles/bulk-import` (mode: `discover` | `import`)
- URL pré-preenchida: `https://brunophysicalrehabilitation.co.uk`
- Tenta sitemap.xml → sitemap_index.xml → sub-sitemaps → scraping do /blog
- Download de imagens para `/uploads/articles/bulk-*`

---

## 🌐 Páginas Públicas — Service Pages (2 Jul 2026 — noite)

### Service pages overhaul (`app/services/[slug]/page.tsx`)
- Nova página `/services/mls-laser` (antes dava 404)
- Layout rico para todas as páginas: hero escuro com gradiente + barra de stats + pills de condições + grelha de benefícios + processo numerado + "quem é para quem" + secção de ciência + chip de detalhes da sessão + FAQ accordion (state-driven) + grelha de serviços relacionados + CTA com localização
- **Fallback DB corrigido** — campos vazios na DB fazem fallback para dados hardcoded (conteúdo biohacking/HRV/sleep já não desaparecia)
- Serviços com dados ricos completos: `biohacking-performance`, `hrv-recovery-monitoring`, `sleep-longevity-optimisation`, `microcurrent`, `mls-laser`, `electrotherapy`, `therapeutic-ultrasound`, `laser-shockwave`

### Audit público de imagens (2 Jul 2026)
- `next.config.js` — adicionado `**.amazonaws.com` + `**.r2.cloudflarestorage.com` a `remotePatterns` para imagens S3 com `<Image>`
- `app/api/image-serve/[id]/route.ts` — proxy de URLs externas (S3, CDN) directamente em vez de redirect — previne falhas de optimização Next.js quando o host não estava em `remotePatterns`
- Imagens MLS Laser — `onError` fallback para `/uploads/mls-laser-*.jpg` para nunca mostrar caixa preta quebrada
- `tests/e2e/public-audit.js` — script Puppeteer para auditoria de páginas públicas (imagens quebradas, 404s, erros de console)

### Email logo branco (2 Jul 2026)
- Suporte a versão branca do logo em emails — fundos teal/escuros
- Fix `completedDate` variável indefinida em templates de email

### Fix Answer Questions 404 (2 Jul 2026)
- `/dashboard/questions` retornava 404 quando pacientes clicavam no link do email
- Middleware corrigido para redireccionar `/dashboard/questions` → rota correcta para PATIENT role

---

## 🏠 Homepage Redesign (3 Jul 2026)

### Ficheiro: `components/landing-page.tsx`

#### Terminologia
- Substituição global: "physiotherapy / fisioterapia" → "physical rehabilitation / reabilitação física"
- Aplica-se a: textos, alt tags, meta copy, CTAs

#### Secções removidas
- Portal Features block, Services grid, MLS feature block destacado, Insoles, Bio, Thermo, How It Works

#### Secções adicionadas
- **The Method** (`id="method"`) — 4 fases da jornada do paciente: Assessment → Plan → Treatment → Performance
- **Differentiators** — narrativa "We don't sell sessions. We deliver results."
- **Patient Journey** (`id="equipment"`) — mesmo conteúdo visual mas com framing nos resultados do paciente, tecnologia como nota de apoio

#### CTAs e navegação
- Hero CTA: "Start Your Programme / Começar o Programa"
- Nav anchors actualizados: `#method`, `#equipment`, `#about`, `#contact`
- Nav no `landing-page.tsx`: O Método, Tecnologia, Artigos, Sobre, Contacto

#### Imagens
- `validImg()` guard — filtra paths `/uploads/` efémeros (sem storage persistente)
- Todas as imagens das settings passaram de `<Image>` (Next.js) para `<img>` simples — evita falhas de optimização com URLs internas da API
- Fallbacks MLS removidos (não referência mais `/uploads/`)

### Contacto e Rodapé — Horários ao Vivo

**Antes:** horários lidos de `businessHoursJson` (settings estáticas)
**Agora:** lidos directamente da tabela `TherapistAvailability` via `/api/public/schedule`

#### Contact Section
- Tabela de 7 dias com horários ao vivo
- Dia de hoje destacado com ponto animado + label "Today"
- Dias fechados em vermelho
- Fallback: Seg–Sáb 09:00–18:00, Dom fechado (quando DB vazia)
- Hint: "Set hours in Admin → Schedule → Availability"

#### Footer (4 colunas)
- Col 1: Logo da marca + tagline + links sociais
- Col 2: Links de navegação (O Método, Tecnologia, Sobre Bruno, Artigos, Contacto)
- Col 3: Contactos das settings (morada, tel, email)
- Col 4: Horários ao vivo (mesmos dados da secção Contacto, hoje em bold)
- Barra inferior: copyright + links Portral do Paciente / Staff Portal

---

## 📡 API Pública (3 Jul 2026)

### `GET /api/public/schedule` — sem autenticação

**Ficheiro:** `app/api/public/schedule/route.ts`

**O que faz:**
- Lê `TherapistAvailability` do terapeuta principal (primeiro `SUPERADMIN/ADMIN/THERAPIST` por `createdAt`)
- Devolve sempre **7 dias** — dias sem registo ficam `closed: true`
- Headers: `Cache-Control: public, s-maxage=300, stale-while-revalidate=60` (5 min CDN)

**Resposta:**
```json
{
  "schedule": [
    { "day": "Monday", "dayOfWeek": 1, "open": "09:00", "close": "17:00", "closed": false },
    { "day": "Sunday",  "dayOfWeek": 0, "open": "09:00", "close": "17:00", "closed": true }
  ]
}
```

**Middleware:** `/api/public` adicionado à lista `publicRoutes` em `middleware.ts`

**Actualização automática:** qualquer save em **Admin → Schedule → Availability** reflecte no site público em até 5 minutos.

---

## 🧭 SiteHeader (3 Jul 2026)

**Ficheiro:** `components/site-header.tsx` — usado em `/login`, `/signup`, `/articles`, e todas as páginas públicas fora da homepage

### Nav actualizada
| Antes | Depois |
|---|---|
| Services (dropdown) | The Method (`/#method`) |
| Insoles (`/#insoles`) | Technology (`/#equipment`) |
| Biohacking (`/biohacking`) | Articles (`/articles`) |
| Articles | About (`/#about`) |
| Help (`/help`) | Contact (`/#contact`) |
| About (`/#about`) | |
| Contact (`/#contact`) | |

- Labels bilingues inline (EN/PT) — sem dependência de `T()` / i18n
- Removido: `ChevronDown`, `Shield`, interface `ServiceLink`, state `serviceLinks`, fetch `/api/service-pages`

### Header fixo
- **`landing-page.tsx`:** `sticky top-0` → `fixed top-0 left-0 right-0` + `<div class="h-16 md:h-20" aria-hidden>` como spacer após o header
- **`site-header.tsx`:** mesma alteração, spacer dentro de React fragment (`<>`)
- Motivo: `sticky` pode falhar se algum ancestral tiver `overflow` definido; `fixed` é incondicional

---

## 📎 Chat + Documentos + Idioma (5 Jul 2026)

### Bug corrigido — Upload no painel do paciente (admin)
- **Causa raiz:** forms de Upload/Write em `app/admin/patients/[id]/page.tsx` estavam renderizados DENTRO da `TabsContent value="resumo"` — clicar "+ Upload" na tab Documentos não mostrava nada
- **Fix:** forms movidos para cima das `<Tabs>` (visíveis de qualquer tab); todos os botões de documentos mudam para a tab `docs`
- Botão "Documents" do header da página agora abre a tab (não navega); página `/admin/patients/[id]/documents` mantém-se como vista "Full"

### Chat com anexos (clinic ↔ patient)
- **Schema:** `ClinicMessage` + `attachmentUrl/attachmentName/attachmentType`; `DocumentSource` + `CHAT_UPLOAD`
- **`lib/chat-attachment.ts`** — helper partilhado: grava ficheiro em `$UPLOADS_DIR/documents/{patientId}/` + auto-regista como `PatientDocument` (source=CHAT_UPLOAD) → ficheiros do chat aparecem na secção Documentos (fonte única)
- **APIs:** `POST /api/patient/messages` e `POST /api/admin/patients/[id]/messages` aceitam `multipart/form-data` (fallback JSON para texto)
- **UIs:** clip no composer — paciente (`app/dashboard/questions/page.tsx`) e admin (`components/admin/patient-messages-tab.tsx`); imagens inline, outros ficheiros como cartão de download
- **Tipos aceites em todo o lado:** `image/*` + PDF/Word/TXT/CSV, máx. 25MB

### Idioma do paciente
- Toggle **EN | PT** no rodapé da sidebar do paciente (`components/dashboard/patient-sidebar.tsx`) — persiste via `PATCH /api/patient/profile` → `User.preferredLocale`
- `lib/notify-patient.ts` já escolhe `plainMessagePt` quando `preferredLocale` começa por `pt` — notificações seguem o idioma do paciente
- `dashboard-layout.tsx` sincroniza locale da DB no primeiro load

### Voltar contextual (admin)
- Detalhe do paciente: `router.back()` com fallback a `/admin/patients` (era hardcoded)
- Permissões: "Voltar" regressa ao detalhe do paciente (era lista)

### Auditoria páginas públicas (mesma sessão, commits anteriores)
- i18n: chaves `svc.mlsLaser/Desc` + `svc.kinesiotherapy/Desc` adicionadas (MLS mostrava chaves cruas)
- "coach/coaching" removido de todas as páginas públicas; `/biohacking` 20+→15+ anos (4 sítios)
- `/get-the-app` adicionado a `publicRoutes` no middleware (redirecionava para login)
- Redirects existentes: `/services/kinesiotherapy`→`exercise-therapy`, `laser-shockwave`→`mls-laser`, `microcurrent`→`electrotherapy`
- Páginas de serviços são editáveis em **Admin → Service Pages** (`/admin/service-pages`); DB tem prioridade sobre conteúdo hardcoded em `app/services/[slug]/page.tsx`
- Todos os 17 links públicos do rodapé verificados 200 em produção

### Deploy/verificação
- `start.sh` corre `prisma db push` no arranque — mudanças de schema aplicam-se automaticamente no deploy
- Monitorização de deploy: comparar `/api/version` antes/depois do push (ver logs do deploy no painel Coolify)

---

## ⚠️ Notas críticas

- **GEMINI_API_KEY** está na DB (não em env var do Coolify) — gerir via Admin → Settings
- **S3 não configurado** — imagens geradas ficam em base64 local, perdem-se no redeploy. Configurar AWS S3 para persistência real.
- **MINIMAX key** tipo `sk-cp-...` = Token Plan key. Se Minimax falhar, verificar tipo de chave no dashboard minimax.
- **Backup SQL** — nunca commitar para git (contém tokens e dados de produção)
- **28 Jul 2026 — INCIDENTE DE SEGURANÇA:** este ficheiro (e o equivalente em `.devin/workflows/`) esteve no repositório **público** do GitHub desde 8 Mar 2026 com a password do SUPERADMIN e prefixos de API keys em texto puro. Password rotacionada, valores removidos deste ficheiro. **Pendente:** tornar o repo privado, rotacionar `NEXTAUTH_SECRET` + todas as API keys listadas acima, considerar limpeza do histórico git (BFG/filter-repo). Nunca mais colar segredos completos ou parciais em ficheiros rastreados pelo git.
