# QA Report — Atividade 29 (Challenges) — T-3/T-4/T-5/T-6

**Data:** 2026-09-11 · `next dev` local, banco `bpr_clinic_local`. Prod intocada. en-GB. Fixtures 2 tenants + seed de logs (WorkoutLog/MealLog), removidos ao final.

**Resultado: ✅ APROVADO — 11/11 cenários PASS (+ PATCH/archive e G8 extras). 0 falhas, 0 erros/warnings de console.**

| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | Admin cria WORKOUT_COUNT (201) + lista com `_count.participants` | ✅ |
| 2 | Inválidos (title/target/janela → 400); CLINIC negado (gate 404) | ✅ |
| 3 | Join idempotente (2x → 1); GET progress=3 + streaks | ✅ |
| 4 | Leaderboard 1 query, ordenado desc (A 3/3 > B 1/3), "nome + inicial" (G6) | ✅ |
| 5 | `completedAt` só na leitura do aluno, idempotente; admin GET não grava | ✅ |
| 6 | MEAL_LOG_DAYS → progress 2/2 | ✅ |
| 7 | UI admin: nav "Challenges" (personal), form, leaderboard; CLINIC sem "Challenges" (G7) | ✅ |
| 8 | UI aluno: seção sidebar, streaks, Join, progresso, leaderboard, empty-state | ✅ |
| 9 | Gating: paciente CLINIC sem seção/API; `/dashboard/challenges` → redirect; cross-tenant 404 | ✅ |
| 10 | Regressão: logs intactos; Journey clínico não tocado; nav clínica inalterada | ✅ |
| 11 | Console 0 erros/0 warnings React | ✅ |
| + | PATCH archive; **G8** subir target zera `completedAt` (confirmado no DB) | ✅ |

## Code review (fork) — sem HIGH; M1/L1/L2 corrigidos
- **G7** confirmado: `visibleAdminSections` filtra nos dois ramos; único renderer usa a versão filtrada → clínica não vê "Challenges".
- **M1**: teste `__tests__/tenant/admin-sections-gating.test.ts` atualizado (o `.toBe(ADMIN_SECTIONS)` quebrou com o filtro) + expectativa stale da Act.26 (equipment/screening clinicalOnly) corrigida → **5/5 verde**.
- **L1**: guarda server-side em `/admin/challenges` (redirect não-personal) além do gate de API.
- **L2**: datas do form em UTC (start e end consistentes).
- **L3** (não-participante vê leaderboard): intencional (social).

## Observações (não bloqueiam)
- Leaderboard mostrou "QA Q." para os 2 alunos — artefato das fixtures (firstName/lastName iguais no padrão), não da lógica.
- Gate de tenant sem TRAINING responde 404 (fail-closed, declarado).
- O QA criou `scripts/qa/challenge-logs-seed.cjs` (ferramenta reutilizável) — dados do DB removidos.

**Screenshots:** `specs/29-challenges-personal/qa/screenshots/`.
