# QA Spec — Atividade 30 (Badges do personal)

Tenant PERSONAL_TRAINER (TRAINING on) com admin + aluno + logs semeados (WorkoutLog/MealLog) + desafios completados; tenant CLINIC (regressão). en-GB. Fixtures limpas.

## T-1 Lib
- **Unit** `earnedBadges`: com signals {totalWorkouts:10, mealDays:0, workoutStreak:7, mealStreak:0, completedChallenges:1} → first_workout/workouts_10/streak_7/challenge_1 earned; workouts_50/streak_30/meal_days_20/challenge_3 não; progress clampado ∈ [0,1].
- **Unit** thresholds de borda (value == threshold → earned).
- `computeSignals` agrega os 5 sinais com logs semeados (via QA de T-2/T-3).

## T-2 Aluno
- **API** `GET /api/badges` (aluno) → lista com earned/progress coerente com os logs semeados.
- **UI** faixa em `/dashboard/challenges`: badges ganhas destacadas, não-ganhas esmaecidas com progresso/tooltip.
- **Auth** sem sessão → 401; tenant CLINIC (paciente) → negado/redirect (a página já redireciona não-personal).

## T-3 Admin + gating
- **API** `GET /api/admin/badges?studentId=` (personal) → badges do aluno; `?studentId=` de outro tenant → 404; sem sessão 401; CLINIC → negado (gate).
- **UI** strip de badges na ficha do aluno (aba Workouts, personal); tenant CLINIC não vê strip.
- **Regressão** nenhuma linha nova no banco (derivado on-read); stack clínica e logs intactos; console limpo.
