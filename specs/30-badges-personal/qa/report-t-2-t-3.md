# QA Report — Atividade 30 (Badges) — T-2/T-3 (T-1 unit-verde)

**Data:** 2026-09-11 · `next dev` local, `bpr_clinic_local`. Prod intocada. en-GB. Fixtures 2 tenants + seed de logs, removidos ao final.

**Resultado: ✅ APROVADO — 6/6 PASS** (ressalva menor: sem-sessão → 307 do middleware, não 401 — comportamento global, segurança intacta).

| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | `GET /api/badges` (aluno) — earned/progress coerentes com logs | ✅ |
| 2 | UI faixa "Achievements" em `/dashboard/challenges` (ganhas/esmaecidas + progresso + tooltip; responsivo 390px) | ✅ |
| 3 | `GET /api/admin/badges` — 200 / cross-tenant 404 / sem studentId 400 | ✅ |
| 4 | UI strip na aba Workouts da ficha do aluno (admin personal) | ✅ |
| 5 | Gating CLINIC: `/api/badges` e `/api/admin/badges` → 404; ficha CLINIC sem aba Workouts/strip | ✅ |
| 6 | Regressão: **0 linhas novas** (on-read); console 0 erros/warnings | ✅ |

**Sinais semeados verificados:** totalWorkouts=10 (first_workout+workouts_10 acesos, workouts_50 0.2), workoutStreak=4 (streak_7 0.571), mealDays=2 (meal_days_20 0.1), completedChallenges=1 (challenge_1 aceso, challenge_3 0.333).

## Code review (fork) — sólido, sem correções
Isolamento/gating corretos (clinicId do ator, `assertPatientAccess` → 404 cross-tenant); sinais corretos (count por sessão, dias distintos UTC); React limpo; tipo local na strip é proposital (não puxar prisma pro client). Nenhum HIGH/MEDIUM.

## Notas (não bloqueiam, fora do feature)
- Sem-sessão responde 307/redirect (middleware), não 401 — global.
- Dev config: `package.json` roda `-p 4000` mas `NEXTAUTH_URL=localhost:3000` — atrito só em dev; vale alinhar.
- QA criou `scripts/qa/badges-seed.cjs` (ferramenta reutilizável); dados removidos.

**Screenshots:** `specs/30-badges-personal/qa/screenshots/`.
