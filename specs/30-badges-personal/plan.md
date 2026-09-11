# Atividade 30 — Badges / conquistas do aluno (personal)

## Objetivo
Camada leve de conquistas em cima dos Challenges: o aluno ganha **badges** por marcos (primeiro treino, 10/50 treinos, streak 7/30 dias, X dias de refeição, desafios completados). Exibidas no portal do aluno (faixa de conquistas) e um resumo no admin do personal (por aluno). Personal-only (gate TRAINING), sem Stripe. **Sem tabela nova** — as badges são **derivadas on-read** dos sinais que já existem.

## Decisões de design
- **Badges derivadas on-read, sem persistência** (v1): a partir de sinais computados dos dados existentes — `WorkoutLog`(set completed), `MealLog`(loggedDate), `ChallengeParticipant.completedAt`, e streaks (reusa `lib/challenges.currentStreak`). Nada de model/migração.
- **Catálogo estático** em `lib/badges.ts` (`BADGE_CATALOG`: key, emoji, label/labelPt, description/descriptionPt, `metric`, `threshold`). `earnedBadges(signals)` = pura, retorna cada badge com `earned` + `progress` até o threshold.
- **Sinais**: `totalWorkouts` (nº de WorkoutLog com ≥1 set completed, all-time), `mealDays` (dias distintos de MealLog, all-time), `workoutStreak`/`mealStreak` (currentStreak), `completedChallenges` (ChallengeParticipant do aluno com completedAt≠null).
- **Gate**: TRAINING (personal por padrão). `assertStudentTrainingAccess` (aluno) / `assertTrainingAccess` + `assertPatientAccess` (admin lendo de um aluno).
- **UI aluno**: faixa de badges no topo de `/dashboard/challenges` (reusa a página; ganhadas destacadas, não-ganhadas esmaecidas com progresso).
- **UI admin**: strip read-only de badges do aluno na ficha (`/admin/patients/[id]`), aba "Challenges" nova OU dentro de uma existente — decisão: pequeno bloco no topo do painel de challenges do aluno (ver Suposição 2).
- **Backlog**: XP/levels/pontos; **unlock persistido + notificação** (avisar o aluno ao ganhar); badges customizadas pelo personal; badges de nutrição/avaliação; mobile.

## Catálogo v1 (proposto)
| key | emoji | condição |
|---|---|---|
| first_workout | 💪 | ≥1 treino logado |
| workouts_10 | 🔟 | 10 treinos |
| workouts_50 | 🏋️ | 50 treinos |
| streak_7 | 🔥 | streak de treino ≥ 7 dias |
| streak_30 | ⚡ | streak de treino ≥ 30 dias |
| meal_days_20 | 🥗 | 20 dias com refeição logada |
| challenge_1 | 🏆 | 1 desafio completado |
| challenge_3 | 🥇 | 3 desafios completados |

## Tarefas
| T-N | Nome | Escopo | Status |
|-----|------|--------|--------|
| T-1 | Lib badges | `lib/badges.ts` (catálogo + `earnedBadges` puro) + `computeSignals(studentId, clinicId)` (agrega os sinais) | concluído |
| T-2 | Aluno (web) | `GET /api/badges` (minhas badges) + faixa em `/dashboard/challenges` | concluído |
| T-3 | Admin + gating | `GET /api/admin/badges?studentId=` + strip na ficha do aluno (personal-only) + regressão | concluído |

## Suposições (validar)
1. **Catálogo v1** acima (8 badges). Ajusto thresholds/itens se quiser.
2. **Admin vê badges** num bloco no topo do painel de Challenges da ficha do aluno (não uma aba nova). OK? (Alternativa: aba própria.)
3. **Sem notificação/persistência** no v1 — badge aparece assim que o dado cruza o threshold, sem "unlockedAt" nem aviso. (Notificar ao ganhar = backlog.)
4. **`totalWorkouts`/`mealDays` são all-time** (não por janela). Streak reusa a regra da ativ.29 (dias consecutivos até hoje/ontem, UTC).

## QA
`qa/qa-spec.md` — unit do `earnedBadges` (thresholds), `computeSignals` com logs semeados; UI aluno (faixa, ganhadas vs não), admin (strip por aluno); gating (clínica não vê; cross-tenant no admin → 404); regressão (nada clínico tocado).
