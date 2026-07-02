---
description: Project vault with all access credentials and infrastructure info for bpr.rehab
---

# BPR Clinic — Project Vault & SPEC Completa

> **⚠️ SENSITIVE — não partilhar publicamente**
> Última actualização: 2 Julho 2026

---

## 🌐 URLs

| Item | URL |
|---|---|
| **Site público** | https://bpr.rehab |
| **Render URL** | https://clinic-1w3u.onrender.com |
| **Admin** | https://bpr.rehab/admin |
| **Render Dashboard** | https://dashboard.render.com |
| **GitHub** | https://github.com/brunoto02028/clinic |
| **Local dev** | http://localhost:3000 |

---

## 🔐 Admin Login

| Campo | Valor |
|---|---|
| **Email** | admin@bpr.rehab |
| **Password** | Bruno@Admin2026! |
| **Role** | SUPERADMIN |
| **Login URL (local)** | http://localhost:3000/staff-login |
| **Login URL (prod)** | https://bpr.rehab/staff-login |

---

## 🏗️ Infraestrutura (Render)

| Componente | Detalhes |
|---|---|
| **Web Service** | `bpr-clinic` — Starter plan — Frankfurt |
| **Service ID** | `srv-d8mh0lnlk1mc738m82ng` |
| **Database** | `bpr-clinic-db` — Basic-256mb — Frankfurt |
| **Database ID** | `dpg-d8mgpurbc2fs73dvc160-a` |
| **PostgreSQL** | v16 (upgradado 2 Jul 2026) |
| **DB name** | `bpr_clinic` |
| **DB user** | `bpr_clinic` |
| **Render API Key** | `rnd_bi5VBQLvzzHrYLMaCh6vwKcU31cd` |

### Deploy flow
```bash
git add -A && git commit -m "feat: descrição"
git push origin main    # Render auto-deploys via GitHub webhook
```
- `start.sh` corre `prisma db push --skip-generate` no arranque (idempotente)
- Nunca commitar: `.env`, `*.sql`, `backup_*.sql`

### ⚠️ Railway — BANIDA PERMANENTEMENTE (Jun 2026)
- NÃO usar Railway para nada. Old DB: `interchange.proxy.rlwy.net:49611` — MORTA.

---

## 🌍 DNS (Hostinger)

| Tipo | Name | Valor |
|---|---|---|
| `ALIAS` | `@` | `clinic-1w3u.onrender.com` |
| `CNAME` | `www` | `clinic-1w3u.onrender.com` |

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

## 🔑 API Keys (todas activas no Render + .env local)

| Serviço | Variável env | Status Render | Notas |
|---|---|---|---|
| **OpenRouter** | `OPENROUTER_API_KEY` | ✅ SET | `sk-or-v1-baff...` — PRIMARY para todo texto |
| **Anthropic** | `ANTHROPIC_API_KEY` | ✅ SET | Fallback se sem OpenRouter |
| **MiniMax** | `MINIMAX_API_KEY` | ✅ SET | `sk-cp-OzXP...` — voz + visão |
| **Groq** | `GROQ_API_KEY` | ✅ SET | `gsk_ki1P...` — fallback texto/whisper |
| **Hugging Face** | `HUGGINGFACE_API_KEY` | ✅ SET | `hf_qhqg...` |
| **Google Gemini** | `GEMINI_API_KEY` | ✅ Na DB | Admin → Settings → AI → Gemini API Key |
| **Google OAuth** | `GOOGLE_CLIENT_ID/SECRET` | ✅ SET | Login Google |
| **Vapi** | `VAPI_API_KEY` | ✅ SET | `7ad173e0...` |
| **Vapi Public** | `VAPI_PUBLIC_KEY` | ✅ SET | `8013e75f...` |
| **Vapi Assistant** | `VAPI_ASSISTANT_ID` | ✅ SET | `cdce0b8c...` (Amy) |
| **Vapi Phone** | `VAPI_PHONE_NUMBER_ID` | ✅ SET | `d9b8f30b...` (US test +18392789516) |

### Auth
| Variável | Valor |
|---|---|
| `NEXTAUTH_URL` | `https://bpr.rehab` |
| `NEXTAUTH_SECRET` | `ba3a0be3...` (ver Render) |

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
```

---

## ⚠️ Notas críticas

- **GEMINI_API_KEY** está na DB (não em env var do Render) — gerir via Admin → Settings
- **S3 não configurado** — imagens geradas ficam em base64 local, perdem-se no redeploy. Configurar AWS S3 para persistência real.
- **MINIMAX key** tipo `sk-cp-...` = Token Plan key. Se Minimax falhar, verificar tipo de chave no dashboard minimax.
- **Backup SQL** — nunca commitar para git (contém tokens e dados de produção)
