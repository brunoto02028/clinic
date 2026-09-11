# T-1: Modelo de dados

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Models `Challenge` + `ChallengeParticipant` + enums, scoping tenant/trainer/student.

## Passos
1. Enums `ChallengeMetric { WORKOUT_COUNT MEAL_LOG_DAYS }`, `ChallengeStatus { ACTIVE ARCHIVED }`.
2. `Challenge` (clinicId, trainerId, title, description?, metric, target Int, startsAt, endsAt, status default ACTIVE, timestamps).
3. `ChallengeParticipant` (challengeId cascade, clinicId, studentId, joinedAt default now, completedAt?, `@@unique([challengeId, studentId])`).
4. Índices: Challenge clinicId/trainerId/status; Participant challengeId/clinicId/studentId.
5. Back-relations em Clinic (challenges, challengeParticipants) e User (`TrainerChallenges`, `StudentChallengeParticipations`).
6. `npx prisma db push` (local) + `generate`.

## Arquivos afetados
- `prisma/schema.prisma`, DB

## Critérios de aceite
- [ ] `prisma validate` ok; tabelas criadas; client expõe `challenge`/`challengeParticipant`.
- [ ] Nenhuma alteração nos models de gamificação clínica (PatientProgress/WeeklyChallenge/Achievement/etc.) nem em WorkoutLog/MealLog.
