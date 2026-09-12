# QA Report — T-6: Gating + regressão

**Data:** 2026-09-12
**Resultado geral:** ✅ aprovado

**Ambiente:** `next dev` local em `http://localhost:4000`, banco local.

**Escopo:** T-6 é um check final consolidado (não uma feature nova). T-1 a T-5 já aprovadas individualmente. Este relatório cobre os 3 itens que ainda não tinham verificação explícita consolidada: (1) gating em todas as rotas novas de `workout-templates`; (2) regressão do fluxo manual do `WorkoutBuilder` + `GET /api/mobile/workouts`/`GET /api/workouts` para aluno só com treino manual; (3) `DELETE` de `WorkoutTemplate` com alunos atribuídos preserva os `Workout`.

**Como foi executado:** fixtures padrão (`tenant-fixtures.cjs`) + um terceiro tenant PERSONAL_TRAINER temporário pro cenário cross-tenant. API via script Node com login real (NextAuth cookie + Bearer mobile). UI via Playwright, login real. Limpeza final: `tenant-cleanup.cjs` → `leftover fixtures: 0`.

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1-6 | Todas as rotas de `workout-templates` (list, CRUD, days, duplicate, assign, sync) — CLINIC sem TRAINING | API | ✅ 404 em todas |
| 7-11 | Mesmas rotas — cross-tenant (PERSONAL_TRAINER contra template de outro) | API | ✅ 404 em todas, sem oráculo de enumeração |
| 12-14 | Criar/editar/excluir treino manual via `WorkoutBuilder` (sem Program Templates) | UI | ✅ idêntico ao fluxo pré-atividade |
| 15-16 | `GET /api/mobile/workouts` / `GET /api/workouts` — aluno só com treino manual | API | ✅ `scheduledDate`/`templateDayId` null, resto do contrato intacto |
| 17-18 | `DELETE` de template com aluno atribuído → `Workout` preservado, só `templateDayId` vira null | API | ✅ |

## Detalhes

### 1-6. CLINIC sem módulo TRAINING → 404 em toda rota nova ✅
Testado contra template real de outro tenant: `GET`/`POST /api/admin/workout-templates`, `GET`/`PATCH`/`DELETE /[id]`, `POST /[id]/days`, `POST /[id]/duplicate`, `POST /[id]/assign`, `GET`/`POST /[id]/sync` — todas `404 {"error":"Not found"}`, bloqueadas por `assertTrainingAccess`.

### 7-11. Cross-tenant (dois tenants PERSONAL_TRAINER distintos) → 404 em toda rota ✅
Mesma bateria de rotas, agora com ambos os tenants tendo TRAINING ligado — confirma bloqueio por tenant ownership (`loadOwnedTemplate`/`assertPatientAccess`), não só pelo gate de módulo. Mesmo corpo de erro em todos os casos, sem oráculo de enumeração.

### 12-14. Regressão do `WorkoutBuilder` manual (ativ.19/32) ✅
Criar/editar (renomear)/excluir um treino manualmente na ficha do aluno, sem tocar em Program Templates: formulário idêntico ao anterior (nome, "Generate with AI", progressão, "Add exercise", sets/reps/load/RPE/RIR/cadência/superset), nenhum campo novo, 0 erros de console em todas as etapas.
- **Evidência:** `screenshots/t-6-workoutbuilder-new-form.png`, `t-6-workoutbuilder-exercise-added.png`, `t-6-workoutbuilder-saved.png`.
- Nota lateral não-bloqueante: busca da biblioteca de exercícios exige clique na lupa (não busca ao digitar) — comportamento pré-existente, não desta atividade.

### 15-16. `GET`s do aluno só com treino manual ✅
`GET /api/mobile/workouts` e `GET /api/workouts` retornaram, para um treino 100% manual, exatamente `scheduledDate: null, templateDayId: null` e o resto do payload idêntico ao formato anterior à atividade — em ambos os endpoints.

### 17-18. `DELETE` de template preserva `Workout` do aluno ✅
Criado template → dia com exercício → atribuído a um aluno (`Workout` real gerado, `templateDayId` preenchido). `DELETE` do template → `200 {"deleted":true}`. `GET` do `Workout` do aluno depois: mesmo `id`, `scheduledDate` e exercícios intactos, só `templateDayId` virou `null` — confirma `onDelete: SetNull` (`prisma/schema.prisma:2962`) contra o banco real, verificado direto pela própria API admin (expõe `templateDayId`).

## Erros de console
Nenhum em nenhuma etapa de UI.

## Falhas e recomendações
Nenhuma falha bloqueante.

## Critérios de aceite — conferência
- [x] Gate confirmado em todas as rotas novas (404 cross-tenant/CLINIC sem módulo).
- [x] Fluxo manual do `WorkoutBuilder` sem regressão; `GET`s seguem com `scheduledDate`/`templateDayId` null para treino manual puro.
- [x] Apagar template preserva os treinos já atribuídos, só desvinculando `templateDayId`.

---

**Resultado:** ✅ aprovado, 18/18 cenários verificados. Nenhum achado bloqueante.

## Limpeza
Todos os dados de teste (tenants QA, templates, workouts) removidos; `tenant-cleanup.cjs` → `leftover fixtures: 0`.
