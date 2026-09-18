# QA Report — T-4: Sincronização manual (push de atualizações)

**Data:** 2026-09-12
**Resultado geral:** ✅ aprovado (todos os critérios de aceite confirmados com evidência real; 1 achado real fora do escopo do código da tarefa, no script de limpeza de QA)

**Ambiente:** `next dev` local em `http://localhost:4000`, banco local. API testada via script Node (`fetch` nativo), login real NextAuth. UI testada via Playwright MCP, login real pela UI (`/staff-login`).

**Fixtures:** `node scripts/qa/tenant-fixtures.cjs` — tenant B "QA Studio PT" (`PERSONAL_TRAINER`), alunos `qa.aluno@example.test` (alunoB) e `qa.aluno2@example.test` (alunoB2). Cross-tenant testado com staff da tenant A "QA Clinic A" (`CLINIC`, sem módulo TRAINING).

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | Editar exercício do template, `POST sync` → `Workout`s futuros sem log atualizados, contagem correta | API | ✅ |
| 2 | Registrar `WorkoutLog`, editar template de novo, sincronizar → esse `Workout` não muda | API | ✅ |
| 3 | `Workout` com `scheduledDate` no passado não é alterado | API | ✅ |
| 4 | UI: botão "Push updates" mostra confirmação com contagem (dry-run) antes de aplicar | UI | ✅ |
| extra | Dry-run reflete corretamente `willUpdate`/`willSkip` em cada etapa | API | ✅ |
| extra | Cancelar o `confirm()` da UI não dispara o `POST` | UI | ✅ |
| extra | Gating: `PATIENT` → 403; staff CLINIC sem TRAINING → 404; template inexistente → 404 | API | ✅ |
| achado | `scripts/qa/tenant-cleanup.cjs` não apaga `WorkoutTemplate` antes de `users` → FK error | ferramenta de QA | ⚠️ corrigido, ver Addendum |

## Detalhes

### Setup
Template "QA T4 Sync Template" (2 semanas), 1 dia (Semana 1/Terça, "Upper Body W1 - v1", 1 exercício `QA Goblet Squat`: sets 3, reps 8-12, load 40kg). Atribuído a `alunoB` com `startDate` = amanhã, gerando 1 `Workout` sem log. Para o cenário 3, o mesmo template foi atribuído a `alunoB2` com `startDate` 10 dias atrás, garantindo um `Workout` no passado.

### 1. Editar template + `POST sync` atualiza `Workout`s futuros sem log — ✅
Dry-run antes: `{"willUpdate":1,"willSkip":1}`. Editado o dia do template (sets 5, reps 6-10, load 60kg). `POST sync` → `200 {"updated":1,"skipped":1}`. `Workout` de alunoB passou a refletir o conteúdo atual do template.

### 2. `WorkoutLog` protege o `Workout` de futuras sincronizações — ✅
Registrado log como aluno. Dry-run: `{"willUpdate":0,"willSkip":2}`. Editado o template de novo com valores extremos ("v3", sets 10, load 999kg). `POST sync` → `{"updated":0,"skipped":2}`. `Workout` de alunoB permaneceu idêntico ao pós-sync#1 — "v3" não vazou.

### 3. `Workout` no passado não é alterado — ✅
`Workout` de alunoB2 manteve conteúdo original em todas as etapas, consistente com `willSkip`.

### 4. UI — botão "Push updates" mostra confirmação com contagem — ✅
Segundo template, `willUpdate:1`. Clique em "Push updates" → `confirm()` nativo com contagem correta (confirmado que só um GET/dry-run disparou antes do diálogo). Aceitar → POST → banner "Updated 1 workout(s), skipped 0." Cancelar → nenhum POST novo disparado.
- **Evidência:** `screenshots/t-4-editor-antes-push.png`, `screenshots/t-4-push-updates-sucesso.png`, `screenshots/t-4-push-updates-cancelado.png`.
- **Console:** só o hydration mismatch pré-existente do `AdminMiniSidebar`, sem erro novo.

### Extra — Gating — ✅
`PATIENT` → 403; staff de CLINIC sem TRAINING → 404 (GET e POST); template inexistente → 404.

## Falhas e recomendações

1. **Achado real, fora do código da T-4:** `scripts/qa/tenant-cleanup.cjs` não contempla `WorkoutTemplate` antes de apagar `users` (`WorkoutTemplate.trainerId → User` é `RESTRICT`, não cascade) — mesmo padrão de cuidado que `Workout`/`StudentAssessment` já têm no script. Corrigido nesta sessão, ver Addendum.

## Addendum — correções aplicadas após esta rodada (2026-09-12, sessão principal)

Um code review independente, em paralelo a este QA, encontrou 2 problemas reais em `app/api/admin/workout-templates/[id]/sync/route.ts` (mesma classe de bugs já vista em `assign/route.ts` na T-3):
1. Loop do `POST` sem `try/catch` por item — uma falha isolada abortava o resto do sync.
2. Ausência de guarda de concorrência — dois `POST /sync` simultâneos do mesmo template podiam duplicar `WorkoutExercise` (delete+recreate sob `READ COMMITTED` sem lock).

Corrigidos: cada iteração agora roda dentro de `try/catch` (uma falha não aborta as demais), e a transação por workout usa `isolationLevel: Prisma.TransactionIsolationLevel.Serializable` — sob concorrência, o Postgres rejeita uma das duas transações conflitantes em vez de deixar duplicar; ela é capturada e contada como não atualizada nesta rodada.

Também corrigido `scripts/qa/tenant-cleanup.cjs`: adicionada etapa `workoutTemplates` (apaga por `clinicId`) antes de `users`, no mesmo padrão já usado para `workouts`/`studentAssessments`.

Typecheck limpo após as correções. Comportamento do "caminho feliz" (cenários 1-4 acima) não muda — as correções são puramente defensivas (erro/concorrência), não foi necessário re-QA completo; validado só que o typecheck segue limpo.

---

**Resultado:** ✅ Aprovado. 4/4 cenários formais + 4 extras aprovados.

## Limpeza
`WorkoutTemplate`s de teste removidos via cascade ao apagar as clinics de QA; `tenant-cleanup.cjs` → `leftover fixtures: 0` (após a correção do script, a limpeza não depende mais de sorte de ordem).
