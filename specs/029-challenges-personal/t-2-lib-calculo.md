# T-2: Lib de cálculo

**Status:** concluído
**Depende de:** T-1

## Objetivo
Funções para computar progresso de um participante, o leaderboard de um desafio, e streaks — tudo **on-read** dos logs.

## Contexto
Fonte: `WorkoutLog` (performedAt, setLogs.completed) e `MealLog` (loggedDate UTC date-only). **Fronteira de dia em UTC (G4)** — alinhado com a nutrição já em prod; NÃO usar fuso do tenant no v1. Janela conta inteira, ignora joinedAt (G2).

## Passos
1. `lib/challenges.ts`:
   - `progressForMany(metric, studentIds[], clinicId, startsAt, endsAt): Map<studentId, number>` — **1 query por desafio (G3)**, não por aluno:
     - `WORKOUT_COUNT` → `workoutLog.findMany({ where:{ clinicId, studentId:{in}, performedAt:{gte,lte}, setLogs:{some:{completed:true}} }, select:{studentId} })` → contar por studentId em memória.
     - `MEAL_LOG_DAYS` → `mealLog.findMany({ where:{ clinicId, studentId:{in}, loggedDate:{gte,lte} }, select:{studentId, loggedDate} })` → distinct `(studentId, loggedDate)` em memória.
   - `leaderboard(challenge, participants)` → usa `progressForMany` (uma query); ordena desc (empate: completedAt/joinedAt asc); retorna `[{studentId, displayName, progress, target, pct, completed}]`. **displayName = "primeiro nome + inicial do sobrenome" (G6)**.
   - `currentStreak(kind, studentId, clinicId)` → dias consecutivos terminando **hoje ou ontem** (carência p/ hoje, G10), em UTC.
   - `validateChallenge(input): string|null` (título; target ≥ 1; endsAt > startsAt; metric válido).
2. Sem N+1: nunca chamar uma query por participante no leaderboard.

## Arquivos afetados
- `lib/challenges.ts` (novo)

## Critérios de aceite
- [ ] `validateChallenge` rejeita título vazio, target < 1, janela invertida, metric inválida.
- [ ] `progressFor` correto para WORKOUT_COUNT e MEAL_LOG_DAYS (teste unitário com logs semeados).
- [ ] `leaderboard` ordena certo e marca completos; `currentStreak` conta dias consecutivos.
