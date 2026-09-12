# QA Report — T-1: Schema + API base do template

**Data:** 2026-09-12
**Resultado geral:** ✅ aprovado (com uma observação não-bloqueante, O1, já convencional neste projeto)

**Ambiente:** `next dev` local em `http://localhost:4000`, banco local (`bpr_clinic_local`). Nenhum acesso a prod, nenhuma edição de código nesta sessão de QA.

**Como foi executado:**
- Fixtures: `node scripts/qa/tenant-fixtures.cjs` (padrão da atividade 20) criou o tenant A "QA Clinic A" (`CLINIC`, sem módulo TRAINING) com `qa.admina@example.test`, e o tenant B "QA Studio PT" (`PERSONAL_TRAINER`) com `qa.trainer@example.test`.
- Como a fixture padrão só tem **um** tenant `PERSONAL_TRAINER`, foi criado um script temporário (`scripts/qa/t1-extra-fixture.cjs`, removido ao final) para um segundo tenant `PERSONAL_TRAINER` ("QA Studio PT2", `qa.trainer2@example.test`) — necessário pro cenário cross-tenant (ambos os lados precisam passar em `assertTrainingAccess`).
- Login: script Node (`fetch` nativo, Node v25) fazendo o fluxo NextAuth real — `GET /api/auth/csrf` → `POST /api/auth/callback/credentials` → cookie de sessão — uma sessão por conta, confirmada via `GET /api/auth/session`.
- Todas as chamadas de API rodaram com `fetch` contra o servidor real, sessão real, banco real.
- T-1 não tem UI (o CRUD é só API; o editor visual é a T-2) — não havia cenário de UI a testar aqui, não usou Playwright.
- Limpeza ao final: os `WorkoutTemplate` criados no teste foram apagados (`deleteMany` por `clinicId`), o tenant extra (`qa-studio-pt2` + `qa.trainer2`) foi removido, e `node scripts/qa/tenant-cleanup.cjs` rodou por cima da fixture padrão → **`leftover fixtures: 0`**. Os dois scripts temporários de QA foram apagados do repo.

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | `POST` criar template válido (`{name, weeks:4}`) | API | ✅ 201 |
| 2 | `POST` sem `name` | API | ✅ 400 |
| 3 | `POST` com `weeks:20` (acima do teto) | API | ✅ 400 |
| 3b | *(derivado)* `POST` com `weeks:0` | API | ✅ 400 |
| 3c | *(derivado)* `POST` com `weeks:12` (limite exato) | API | ✅ 201 |
| 3d | *(derivado)* `POST` com `weeks:2.5` (não-inteiro) | API | ✅ 400 |
| 4 | `GET` lista só do próprio tenant (B e, em espelho, C) | API | ✅ |
| 5 | `GET /[id]` de template de outro tenant | API | ✅ 404 |
| 6 | `PATCH`/`DELETE` de template de outro tenant | API | ✅ 404 (ambos) |
| 6b | *(derivado)* id inexistente — corpo idêntico ao cross-tenant (sem oráculo) | API | ✅ |
| 7 | Todas as rotas por staff de CLINIC sem TRAINING | API | ✅ 404 (5/5) |
| 8 | Todas as rotas sem sessão | API | ⚠️ ver O1 — bloqueadas, mas via redirect do middleware, não 401 JSON da rota |
| — | *(positivo)* `GET`/`PATCH`/`DELETE` do próprio template, incl. validação de `name` vazio e `weeks` no `PATCH` | API | ✅ |

## Detalhes

### 1–3d. Criação e validação de `weeks`/`name` ✅
```
POST /api/admin/workout-templates {"name":"Hipertrofia 4 semanas","weeks":4}  (qa.trainer, tenant B)
→ 201 {"id":"...","clinicId":"...","trainerId":"...","name":"Hipertrofia 4 semanas","description":null,"weeks":4,"isActive":true,...}

POST /api/admin/workout-templates {"weeks":4}
→ 400 {"error":"name is required"}

POST /api/admin/workout-templates {"name":"Teto excedido","weeks":20}
→ 400 {"error":"weeks must be an integer between 1 and 12"}

POST /api/admin/workout-templates {"name":"Zero semanas","weeks":0}
→ 400 {"error":"weeks must be an integer between 1 and 12"}

POST /api/admin/workout-templates {"name":"Teto exato 12","weeks":12}
→ 201 (confirma que o limite é inclusivo, 1-12)

POST /api/admin/workout-templates {"name":"Semanas fracionarias","weeks":2.5}
→ 400 {"error":"weeks must be an integer between 1 and 12"}
```
Template criado vem vazio (`GET /[id]` confirma `"days":[]`), conforme o objetivo da T-1.

### 4. Listagem escopada por tenant ✅
`GET /api/admin/workout-templates` como `qa.trainer` (B) devolveu só os 2 templates de B; como `qa.trainer2` (C) devolveu só o 1 de C. Nenhum vazamento. Inclui `dayCount`/`exerciseCount` calculados.

### 5–6. Cross-tenant → 404 ✅
Com `qa.trainer` (B) contra o template de `qa.trainer2` (C):
```
GET    /api/admin/workout-templates/{templateC}   → 404 {"error":"Not found"}
PATCH  /api/admin/workout-templates/{templateC}   {"name":"hacked"} → 404 {"error":"Not found"}
DELETE /api/admin/workout-templates/{templateC}   → 404 {"error":"Not found"}
```

### 6b. Sem oráculo de enumeração (derivado) ✅
As mesmas 3 chamadas com id `does-not-exist-id` devolveram **o mesmo status e corpo** (`404 {"error":"Not found"}`) que o cross-tenant — indistinguível.

### 7. CLINIC sem módulo TRAINING → 404 em tudo ✅
Com `qa.admina` (tenant A, sem `ClinicModuleAccess` TRAINING): `GET` lista, `POST`, `GET/PATCH/DELETE /[id]` (mesmo em template de outro tenant) → todos `404 {"error":"Not found"}`.

### 8. Sem sessão ⚠️ (ver O1)
Todas as rotas devolveram `307`, `Location: /login?callbackUrl=...` — bloqueado pelo `middleware.ts` antes de chegar no handler.

### Positivos (próprio tenant) ✅
```
GET    → 200, days:[]
PATCH  {"description":"Editado via QA","weeks":5} → 200, gravado
PATCH  {"name":"   "}   → 400 {"error":"name cannot be empty"}
PATCH  {"weeks":20}     → 400
DELETE → 200 {"deleted":true}
GET (após delete) → 404
```

## Erros de console
Não aplicável — T-1 é só API.

## Falhas e recomendações
- **O1 (não-bloqueante, padrão já documentado no projeto).** "Sem sessão" responde **307 redirect** (middleware), não `401 {"error":"Unauthorized"}` do handler — mesmo comportamento de todo `/api/admin/**` hoje (já registrado em `specs/32-ai-workout-builder/qa/report-t-1-a-t-3.md` e `specs/20-.../qa/report-t-4.md`). Não é regressão desta tarefa; só nota pra quem escrever testes da T-6.
- Nenhum outro achado.

## Critérios de aceite — conferência
- [x] Schema aditivo já aplicado (models `WorkoutTemplate`/`WorkoutTemplateDay`/`WorkoutTemplateExercise`, `Workout.scheduledDate`/`templateDayId` opcionais).
- [x] CRUD gated por `assertTrainingAccess`, 404 pra CLINIC sem TRAINING.
- [x] `GET`/`PATCH`/`DELETE` de outro tenant → 404, nunca o registro.

---

**Resultado:** ✅ aprovado, 13/13 cenários da qa-spec (mais 5 derivados) passaram; 1 observação não-bloqueante (O1) idêntica a um padrão já conhecido do projeto.

## Code review (posterior ao QA)

Revisão adversarial independente encontrou 3 problemas reais, todos corrigidos antes de marcar a tarefa como concluída:

1. **Race condition no upsert de dia** (`days/route.ts`): `findFirst` + `create`/`update` não era atômico — duas requisições concorrentes na mesma célula (weekIndex+dayOfWeek) podiam criar 2 `WorkoutTemplateDay` para a mesma posição. Corrigido: `@@unique([templateId, weekIndex, dayOfWeek])` no schema + `prisma.workoutTemplateDay.upsert` (vira `INSERT ... ON CONFLICT DO UPDATE` atômico no Postgres).
2. **`Boolean(body.isActive)` mascarava bug de coerção**: `Boolean("false")` é `true` em JS — uma string `"false"` do client não desativaria o template. Corrigido: exige `boolean` estrito, rejeita com 400 caso contrário.
3. **`PATCH weeks` não validava dias órfãos**: reduzir `weeks` abaixo de dias já criados deixava `WorkoutTemplateDay` com `weekIndex` fora do novo intervalo, sem erro. Corrigido: `PATCH` rejeita com 400 se existirem dias além do novo `weeks` ("remova-os primeiro").

Migração (`@@unique`) reaplicada localmente sem perda de dado real (nenhuma duplicata existente). Typecheck limpo após as correções.
