# Atividade 29 — Challenges / gamificação do personal trainer

## Objetivo
Dar retenção ao produto do personal: o personal cria **desafios** (ex.: "treinar 12x no mês", "logar refeições em 20 dias"), os alunos **participam**, e há **leaderboard** entre os alunos do estúdio + **streaks** de consistência. Alimentado pelos **logs já existentes** (`WorkoutLog`, `MealLog`) — nada de entrada manual. Tenant+aluno scoped, personal-only (gate TRAINING), sem Stripe. Web + portal do aluno; mobile depois.

## Situação atual (do scan)
- Existe a stack "BPR Journey" (XP/badges/`WeeklyChallenge`/quizzes) **clínica-temática**, hoje **visível a todos** (sem gate) e com progresso por **contador manual** — NÃO lê `WorkoutLog`/`MealLog`. Reusá-la entrelaça o clínico e não resolve o "alimentado por logs".
- `WorkoutLog` (clinicId, studentId, performedAt, setLogs.completed) e `MealLog` (clinicId, studentId, loggedDate, `@@unique(student,meal,day)`) são a fonte ideal, já indexados por student+clinic.
- Helper de agregação on-read com `weekKey()` (ISO week) em `app/api/admin/workouts/progress/route.ts` — reusar o padrão.
- Gate: `assertTrainingAccess`/`assertStudentTrainingAccess`/`isTrainingEnabled`. `tenantWhere`, `assertPatientAccess`.
- `patient-sections.ts` tem `personalOnly` (workouts/nutrition/billing). **`admin-sections.ts` só tem `clinicalOnly`** — falta `personalOnly` para uma seção admin personal-only.
- Scheduler in-process em `lib/background-jobs.ts` (opcional; v1 computa on-read).

## Decisões de design
- **Modelos novos** `Challenge` + `ChallengeParticipant` (personal-only, alimentados por logs) — **NÃO** reusar `WeeklyChallenge`/Journey clínico (mantém clínico intocado e personal limpo).
- **Métricas v1 (contagem na janela [startsAt, endsAt])**:
  - `WORKOUT_COUNT` — nº de `WorkoutLog` com ≥1 set `completed` no período.
  - `MEAL_LOG_DAYS` — nº de dias distintos (`loggedDate`) com `MealLog` no período.
  (Desafios de **streak** consecutivo = backlog; v1 são contagens simples.)
- **Progresso e leaderboard computados on-read** dos logs (mirror do `weekKey`/agregação de workouts/progress). Sem agregados materializados no v1 (cron = futuro). `ChallengeParticipant.completedAt` é gravado oportunisticamente na leitura quando `progresso ≥ target`.
- **Leaderboard**: participantes ordenados por progresso desc (empate → quem atingiu antes / joinedAt). Só entre alunos do mesmo estúdio.
- **Join**: o aluno entra no desafio pelo portal (cria `ChallengeParticipant`); o personal cria o desafio e vê o leaderboard.
- **Streaks** (consistência): exibidos como stat no portal do aluno (streak atual de treino e de log de refeição, computado on-read) — motivacional, não é um tipo de desafio no v1.
- **Superfície admin = seção top-level "Challenges"** (studio-wide, não por-aluno). Exige adicionar um flag **`personalOnly`** em `admin-sections.ts` + a seção.
- **G7 (crítico) — o flag `personalOnly` tem que filtrar no ramo `!isPersonal`**: hoje `visibleAdminSections` faz `if(!isPersonal) return ADMIN_SECTIONS` (early-return sem filtro) → uma seção `personalOnly` vazaria para clínicas. O fix filtra `personalOnly` também nesse ramo (e refiltra seções vazias); conferir `getActiveAdminNav` e todo consumidor de `ADMIN_SECTIONS` cru.
- **G3 — leaderboard em 1 query por desafio** (sem N+1): um `findMany`/agregação escopado a todos os `studentId` participantes de uma vez. WORKOUT_COUNT respeita "≥1 set `completed`" (via `where.setLogs.some.completed`); MEAL_LOG_DAYS = distinct `(studentId, loggedDate)` agregado em memória.
- **G4 — fronteira de dia em UTC** (alinhado com a nutrição já em prod, que grava `loggedDate` UTC date-only). Não usar fuso do tenant no v1 (evita off-by-one incoerente entre aderência e challenge/streak).
- **G2 — janela conta inteira**: `progressFor` conta os logs em `[startsAt,endsAt]` independentemente de `joinedAt` (entrar = opt-in ao leaderboard; a janela é a janela). Declarado.
- **G5 — `completedAt` idempotente e só na leitura do próprio aluno**: `updateMany({where:{id, completedAt:null}, data:{completedAt:now}})` (single write, sem corrida), disparado na leitura do aluno — nunca no GET do admin.
- **G8 — editar target/janela limpa `completedAt` obsoleto**: no PATCH, zerar `completedAt` de quem não satisfaz mais o novo target/janela.
- **G6 — privacidade do leaderboard**: exibir "primeiro nome + inicial do sobrenome" por padrão (não nome completo); opt-out = futuro.
- **G10 — streak**: dias consecutivos terminando **hoje ou ontem** (carência para hoje ainda não logado), em UTC.
- **Portal do aluno**: seção `personalOnly` "Challenges" → `/dashboard/challenges`.
- **Gate**: TRAINING (personal por padrão). Inglês UK + relabel.
- **Mobile**: fora do v1.
- **Journey clínico**: hoje aparece para todos (gap pré-existente); **fora do escopo desta atividade** corrigir — anoto como observação, não mexo para não arriscar regressão clínica.

## Modelo de dados (resumo)
```
enum ChallengeMetric { WORKOUT_COUNT MEAL_LOG_DAYS }
enum ChallengeStatus { ACTIVE ARCHIVED }
Challenge { id, clinicId, trainerId, title, description?, metric, target Int,
            startsAt, endsAt, status(ChallengeStatus @default ACTIVE), timestamps }
ChallengeParticipant { id, challengeId, clinicId, studentId, joinedAt, completedAt?,
                       @@unique([challengeId, studentId]) }
```
Índices clinicId/trainerId/status; participant por challengeId/studentId/clinicId. Back-relations em Clinic/User.

## Tarefas
| T-N | Nome | Escopo | Status |
|-----|------|--------|--------|
| T-1 | Modelo de dados | `Challenge` + `ChallengeParticipant` + enums + back-relations + `db push` | concluído |
| T-2 | Lib de cálculo | `lib/challenges.ts` — progresso por participante (WorkoutLog/MealLog na janela), leaderboard, streaks; reusa `weekKey`/padrão de agregação | concluído |
| T-3 | API admin | `/api/admin/challenges` (CRUD) + leaderboard por desafio; tenant scoped, gate TRAINING | concluído |
| T-4 | UI admin + nav | flag `personalOnly` em `admin-sections.ts` + seção "Challenges" + página criar/listar + leaderboard | concluído |
| T-5 | Aluno (web) | `/api/challenges` (listar ativos + meu progresso + leaderboard) + join + `/dashboard/challenges` + seção portal + streaks | concluído |
| T-6 | Gating + vocab + guardas + regressão | personal-only em tudo; clínico (Journey) intocado; guarda de rota; sem vazamento | concluído |

## Suposições (validar)
1. **Métricas v1 = WORKOUT_COUNT + MEAL_LOG_DAYS** (contagem na janela). Streak-como-desafio e outras métricas (passos, peso) = futuro. OK?
2. **Aluno se auto-inscreve** no desafio pelo portal (não o personal inscrevendo). OK? (Alternativa: personal inscreve todos automaticamente.)
3. **Leaderboard visível entre alunos** do estúdio, mas com **"primeiro nome + inicial"** (G6), não nome completo. Opt-out por privacidade = futuro.
7. **MEAL_LOG_DAYS depende de o aluno ter plano de nutrição ativo** (MealLog só existe com plano da ativ.27). Num estúdio sem nutrição, o desafio de refeição fica impossível — o form avisa/condiciona (G9).
4. **Sem badges/XP no v1** — só desafios + leaderboard + streaks. Badges/pontos = futuro (dá pra reusar `PatientBadge` depois).
5. **On-read** (sem cron) no v1; materialização se escalar.
6. **Novo flag `personalOnly` em admin-sections** (mexe na nav do admin) — necessário para a seção Challenges aparecer só para personal. Baixo risco (espelha `clinicalOnly`), mas toca código compartilhado.

## Backlog declarado
- Desafios de **streak consecutivo**; métricas extras (passos, peso, medidas).
- **Badges/XP/pontos** e prêmios; reuso do `PatientBadge`/`Achievement`.
- **Materialização** via `lib/background-jobs.ts` se o on-read pesar.
- **Mobile** (tela de challenges).
- Corrigir o **gate do Journey clínico** (hoje visível a todos) — atividade própria.

## QA
`qa/qa-spec.md` — cenários por tarefa: criar desafio (admin), aluno entra, logs de treino/refeição movem o progresso, leaderboard ordena certo, completedAt ao atingir target, streaks; gating (clínica sem Challenges; guarda de rota); isolamento tenant/aluno. Regressão: Journey clínico e logs intactos.
