# QA — Atividade 55, T-6 a T-10 (lado do personal)

- **Data:** 18/09/2026
- **Código:** working tree não commitado da branch `brunoto02028/Personal`
- **Ambiente:** Next dev em :4002, banco local com fixtures (`scripts/qa/tenant-fixtures.cjs`). Um contexto novo de Playwright por rodada, com cache HTTP desligado. Outro agente de QA (lado do aluno) rodou no mesmo servidor ao mesmo tempo. Nenhum 429.

| Tarefa | Veredito (1ª rodada) |
|---|---|
| T-6 Ficha sem aba "Exercises" | **APROVADO** |
| T-7 "View as Student" | **APROVADO** (ressalvas R-1 e R-2) |
| T-8 Biblioteca vazia | **APROVADO** |
| T-9 Vocabulário | **REPROVADO**: sobram vazamentos (ver 9.1) → corrigidos e retestados em `report-t-9-reteste.md` |
| T-10 Painel do personal | **APROVADO** |

## Resumo

| # | Cenário | Tipo | Resultado |
|---|---|---|---|
| 6.1 | trainer: ficha do `qa.aluno` | UI | ✅ abas Summary, Documents, Messages, Activity, Workouts, Assessments, Nutrition, Billing; **sem "Exercises"**; Workouts abre o builder com "Workout A" |
| 6.2 | admina: ficha do `qa.pacientea` | UI | ✅ aba "Exercises" continua lá, abre e mostra "0 exercises prescribed" |
| 7.1 | trainer: ficha → "View as Student" | UI | ✅ `/dashboard` mostra "Welcome to QA Studio PT!", sem "Therapist Dashboard"; "Voltar ao Admin" volta para a ficha e apaga os cookies |
| D-7a | admina: "View as Patient" (clínica) | UI | ✅ abre a home do paciente ("Welcome to BPR!") |
| D-7b | trainer depois de sair, em `/dashboard` | UI | ✅ redireciona para `/admin` |
| 8.1 | trainer: `/admin/exercises` sem exercício com vídeo | UI | ✅ aviso âmbar "Build your exercise library" (PT: "Monte a sua biblioteca…") |
| 8.2 | trainer: Workouts → Generate with AI | UI+API | ✅ 400 `code:"EMPTY_LIBRARY"`; mensagem guiada; o link leva a `/admin/exercises` |
| D-8a | com 1 exercício com vídeo (temporário) | UI | ✅ o aviso some |
| D-8b | com busca preenchida | UI | ✅ o aviso some |
| D-8c | admina: `/admin/exercises` | UI | ✅ sem aviso (clínica) |
| D-8d | treino do aluno depois do EMPTY_LIBRARY | DB | ✅ "Workout A" intacto |
| 9.1 | crawl do admin do trainer (22 telas) e do portal do aluno (16) | UI | ❌ telas-alvo da T-9 corrigidas, mas sobram vazamentos (tabela abaixo) |
| 10.1 | trainer: `/admin` | UI+API | ✅ "Trainers 1 · Active trainers"; 0 estetoscópios; seção "Studio" com haltere |
| D-10 | admina: `/admin` | UI+API | ✅ "Therapists 1" (igual a antes); 3 estetoscópios mantidos |

## Evidências principais

### 6.1 / 6.2: abas da ficha
```
trainer tabs: Summary, Documents, Messages, Activity, Workouts, Assessments, Nutrition, Billing
admina  tabs: Summary, Screening, Assessments, Clinical Notes, Documents, Messages, Protocol, Exercises, Rehab Agent, Evidence, Activity
admina Exercises (aria-selected=true): "0 exercises prescribed … No exercises prescribed yet."
console: sem erros; nenhuma resposta >= 400
```
- Screenshots: `t-6-trainer-ficha-abas.png`, `t-6-trainer-workouts.png`, `t-6-admina-ficha-exercises.png`

### 7.1: View as Student
```
botão "View as Student" → nova aba /dashboard, title "QA Studio PT"
hasTherapistDashboard=false ; "Welcome to QA Studio PT!" ; banner "Visualizando como: QA qa.aluno"
"Voltar ao Admin" → /admin/patients/<id> ; cookies impersonate-* depois = []
/dashboard sem impersonação → /admin
```
- Screenshots: `t-7-trainer-view-as-home.png`, `t-7-trainer-voltar-admin.png`, `t-7-admina-view-as-home.png`, `t-7-admina-voltar-admin.png`

Ressalvas:
- **R-1:** o banner dizia "o que o paciente vê" no estúdio. **Corrigido:** agora diz "aluno" no estúdio (`components/impersonation-banner.tsx`).
- **R-2:** durante a impersonação, a barra lateral mostra o nome do admin, não o do aluno. Já era assim antes e fica anotado.

### 8.2: IA com a biblioteca vazia
```
POST /api/admin/workouts/ai-generate {"studentId":"…","goal":"build strength","level":"intermediate"}
HTTP/1.1 400 {"error":"Add exercises with video to your library first.","code":"EMPTY_LIBRARY"}
UI: "Your exercise library has no exercises with video yet. … Open exercise library →"
```
- Screenshots: `t-8-trainer-biblioteca-vazia.png`, `t-8-trainer-ai-biblioteca-vazia.png`, `t-8-trainer-biblioteca-com-video.png`, `t-8-admina-biblioteca-sem-banner.png`

Nota de baixa severidade: um exercício com `videoUrl: ""` conta para a IA mas não para o aviso. Não foi corrigido, porque o upload nunca grava string vazia.

### 10.1: painel
```
GET /api/admin/stats  trainer → totalTherapists 1 (THERAPIST 0 + ADMIN bookable 1)
                      admina  → totalTherapists 1 (THERAPIST 1 + ADMIN bookable 0)
/admin trainer: stethoscope = 0, dumbbell = 4 ; admina: stethoscope = 3
crawl das 22 telas do menu do trainer: 0 estetoscópios
```
- Screenshots: `t-10-trainer-admin.png`, `t-10-admina-admin.png`

### 9.1: vazamentos que sobraram na 1ª rodada
Todas as 38 rotas deram 200, sem erros de página.

**Telas-alvo da T-9 corrigidas:** `/dashboard/questions`, `/tasks`, `/profile`, `/admin/waitlist`, `/availability`, `/achievements`, `/quizzes`, `/video-consultations`; o título de `/admin/journey` virou "Journey Control Centre".

**Nomes próprios esperados:**
- "QA Studio PT · Powered by BPR" (branding);
- "This is fitness coaching, not medical… treatment" (aviso intencional do termo de treino).

**Vazamentos reais e o que foi feito:**

| Onde | Texto | Correção |
|---|---|---|
| Menu do aluno | "BPR Journey" / "Jornada BPR" | vocabulário: tira "BPR" |
| `/dashboard/journey` | "most consistent patients", "Dedicated Patient", "BPR Ambassador", "…Treatment Plan" | `relabel` no percentil, nas badges e nas missões; vocabulário tira "BPR" |
| `/dashboard/community` | "BPR Arena" | `relabel` → "Arena" |
| `/dashboard/education` | "Your therapist will assign…" | `relabel`; o item "Learn" também saiu do menu do aluno (o estúdio não cria conteúdo) |
| `/dashboard/appointments` | vitrine clínica do paywall | some com a correção do F-1 |
| `/admin/journey` | "…patient engagement" | `relabel` |
| `/dashboard/questions` | placeholder "Write a message to the clinic…" e "Your therapist will review…" | `relabel` |
| `/admin/video-consultations` | "Select patient..." | `relabel` |
| Menu do trainer em PT | "Clinico" (sem acento, o vocabulário não casava) | acento corrigido em `lib/admin-sections.ts`; vira "Treino" no estúdio |
| PT, telas do aluno | "Mensagens da Estúdio", "pela sua estúdio" | vocabulário PT acerta o gênero ("do estúdio", "pelo seu estúdio") |

## Achado fora do escopo da rodada
**F-1 (T-1): paywall falso na tela "Sessions" do aluno de estúdio.**
- **Causa:** `GET /api/patient/status` devolvia `serviceAccess.CONSULTATION:false`, e o `AssessmentGate` mostrava "you need an active plan or package".
- **Correção:** para aluno de estúdio, `CONSULTATION` é liberado por padrão, a menos que o personal trave ou esconda Sessions (`moduleOverrides.mod_appointments`).
- **Reteste:** em `report-t-9-reteste.md`.

## O que mudou no banco e foi restaurado
- **Exercício "QA Goblet Squat":** o `videoUrl` foi preenchido por cerca de 1 minuto (D-8a) e voltou a `null`.
- **Impersonação:** encerrada, com os cookies vazios.
- **IA:** 2 das 20 gerações diárias de `qa-studio-pt` foram usadas. O contador fica em memória.
