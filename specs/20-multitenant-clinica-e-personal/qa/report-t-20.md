# QA T-20 — Modelo e API de treino

**Atividade:** specs/20-multitenant-clinica-e-personal
**Tarefa:** T-20 (Modelo e API de treino do personal)
**Data:** 2026-09-10
**Ambiente:** banco local `bpr_clinic_local`; dev server local :4194 (`OUTBOUND_MODE=sink`). Produção não tocada.
**Resultado:** ✅ **APROVADO** (jest 220/220; suíte runtime 25/25)

## Entregue
- **Modelos novos (migração aditiva, `db push` local):** `Workout`, `WorkoutExercise`, `WorkoutLog`, `WorkoutSetLog`. Nenhuma tabela existente alterada (só back-relations virtuais do Prisma em `Clinic`/`User`/`Exercise`, que não criam coluna). A prescrição clínica (`ExercisePrescription`/`TreatmentProtocol`) não foi tocada.
- **Módulo `TRAINING`** no enum `ClinicModule`. Gate em `lib/workout-access.ts`: **default-on só para tenant personal**; qualquer tenant pode ligar/desligar via `ClinicModuleAccess` (que vence o default). Clínica sem o módulo → 404.
- **API CRUD (staff):** `GET/POST /api/admin/workouts`, `GET/PATCH/DELETE /api/admin/workouts/[id]` — via `tenant-access` (404 para tenant alheio, sem oráculo), com validação de faixas e checagem de posse do exercício no tenant.
- **Validação pura** (`lib/workout-validation.ts`): RPE 1–10, RIR 0–5, reps/carga ≥ 0, repsMax ≥ repsMin — fail-closed.

## Evidências

### Unidade — `__tests__/personal/workout-validation.test.ts` (11) ✅
Faixas válidas/ inválidas de RPE/RIR/reps/carga, repsMax<repsMin, exerciseId obrigatório, limites (rir=0, rpe=1), lista (null/array/erro). Parte da suíte jest completa: **220/220 (22 suites)**.

### Runtime — suíte de isolamento (`npm run test:tenants`) → **25/25**
```
W1 personal admin creates workout                — status 201
W2 clinic admin blocked (module off) 404          — status 404
W3 clinic admin → personal workout 404            — status 404
W4 invalid rpe rejected 400                       — status 400
W5 foreign-tenant exercise rejected 400           — status 400
```
(+ as 11 cenas ISO, 6 de gate G1–G6 e 3 de ISO-10 continuam passando — sem regressão.)

### Limpeza de fixtures
`scripts/qa/tenant-cleanup.cjs` passou a apagar `workoutLogs`/`workouts` **antes** dos usuários — `Workout.trainer` é `RESTRICT` (igual a `ExercisePrescription.therapist`), então apagar o trainer antes do treino falhava. Corrigido; suíte fecha limpa (0 fixtures restantes; 0 workouts órfãos verificados no banco).

## Critérios de aceite
- [x] Cenários da T-20 passando (W1–W5 + unidades).
- [x] Nenhuma tabela existente alterada (só modelos novos; back-relations virtuais).

## Respostas ao code review
Isolamento, gate do módulo, schema aditivo e o PATCH transacional foram **confirmados corretos** pelo review. Os 5 achados (validação/robustez, baixa severidade) foram corrigidos:

| # | Achado | Correção |
|---|--------|----------|
| 1 | Campos `Int` (sets/reps/restSeconds) aceitavam decimal → 500 no Prisma | ✅ `intAtLeast` (Number.isInteger) — decimal agora → 400. Teste dedicado. |
| 2 | `numAtLeast` aceitava `Infinity`/`NaN` | ✅ `Number.isFinite` — não-finito → 400. Teste dedicado. |
| 3 | `daysOfWeek` sem limite 0–6 | ✅ filtro `0 ≤ d ≤ 6` no POST e PATCH. |
| 4 | `name` não-string lançava `TypeError` → 500 | ✅ guarda `typeof === "string"` no POST (PATCH já tinha). |
| 5 | GET rethrow de erro não-AccessError sem log/sanitização | ✅ GET (coleção e item) agora logam e retornam 500 sanitizado, como os writes. |

Jest completo após correções: **223/223**.

## Notas
- **Escopo desta tarefa:** modelo + API **staff** (personal monta o treino). O consumo pelo aluno (ver treino, registrar séries) é T-22 (web) e T-23 (app); a escrita de `WorkoutLog`/`WorkoutSetLog` via API do aluno entra lá. Os modelos de log já existem como fundação.
- Deploy: a coluna do enum `TRAINING` e as tabelas novas entram em prod pelo `db push` do `start.sh` (aditivo), como o `Clinic.type`.
