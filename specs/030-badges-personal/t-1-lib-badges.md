# T-1: Lib badges

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Catálogo estático + função pura `earnedBadges` + agregador de sinais `computeSignals`.

## Passos
1. `lib/badges.ts`:
   - `interface BadgeDef { key; emoji; label; labelPt; description; descriptionPt; metric: "totalWorkouts"|"mealDays"|"workoutStreak"|"mealStreak"|"completedChallenges"; threshold: number }`.
   - `BADGE_CATALOG: BadgeDef[]` (os 8 do plano).
   - `interface BadgeSignals { totalWorkouts; mealDays; workoutStreak; mealStreak; completedChallenges }`.
   - `earnedBadges(signals): Array<BadgeDef & { earned: boolean; progress: number; value: number }>` — pura; `value` = signal da metric, `earned = value >= threshold`, `progress = min(1, value/threshold)`.
   - `computeSignals(studentId, clinicId): Promise<BadgeSignals>` — agrega: `totalWorkouts` (WorkoutLog com set completed), `mealDays` (distinct loggedDate UTC), `workoutStreak`/`mealStreak` (reusa `currentStreak` de `lib/challenges`), `completedChallenges` (count ChallengeParticipant completedAt≠null).

## Arquivos afetados
- `lib/badges.ts` (novo)

## Critérios de aceite
- [ ] `earnedBadges` marca earned corretamente por threshold; progress clampado.
- [ ] `computeSignals` agrega os 5 sinais (verificado com logs semeados no QA de T-2/T-3).
- [ ] Puro/sem efeito colateral em `earnedBadges`.
