# QA Report — Hardening pós-code-review: bloqueio de escrita sob impersonação + guard de usuário inexistente

**Data:** 2026-09-19
**Escopo:** 4 correções apontadas por code review formal sobre a correção anterior de impersonação (`qa-reports/impersonation-fix-2026-09-19.md`, aprovada). Não é uma tarefa de `specs/`; não existe `qa-spec.md` formal para este trabalho — cenários derivados a partir da descrição das 4 correções fornecida pelo autor.
**Ambiente:** dev local, `http://localhost:4210` (já rodando, `/api/health` → `degraded` só por uso de memória do processo dev, `database: ok` — não impediu os testes), banco local (Postgres via `.env` `DATABASE_URL`).
**Resultado geral:** ✅ **Aprovado**

## Resumo

| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1a | POST `/confirm-schedule` — paciente real confirma sua agenda (regressão) | API + DB | ✅ |
| 1b | POST `/confirm-schedule` — staff impersonando → 403, nenhuma `ClinicMessage`/`Appointment` alterada | API + DB | ✅ |
| 2a | POST `/outcome-measures` — paciente real registra (regressão, usado pelo check-in semanal) | API + DB | ✅ |
| 2b | POST `/outcome-measures` — staff impersonando → 403, nenhuma `PatientOutcomeMeasure` criada | API + DB | ✅ |
| 3a | POST `/consultation-recording` — paciente real faz upload (regressão) | API + DB | ✅ |
| 3b | POST `/consultation-recording` — staff impersonando → 403, nenhuma `ConsultationRecording` criada | API + DB | ✅ |
| 4a | GET `/outcome-measures` e `/adherence` — usuário existente, com e sem dados → 200 (nunca 404) | API | ✅ |
| 4b | GET `/outcome-measures` e `/adherence` — sessão válida p/ usuário que não existe mais → 404 `User not found` | API | ✅ |
| — | GET `/outcome-measures` e `/adherence` sob impersonação continuam 200 (guard novo não quebrou o fluxo já aprovado) | API | ✅ (regressão extra, não pedida, verificada por precaução) |
| — | Console do browser durante os testes de impersonação | UI | ✅ só ruído esperado dos próprios `fetch` 403 |
| — | `npx tsc --noEmit -p .` (excl. `reconstruir/`) vs. baseline 1898 | Build | ✅ 1898 = 1898, nenhum erro novo |

## Fixtures usadas

- `scripts/qa/tenant-fixtures.cjs` + `scripts/qa/impersonation-fix-fixtures.cjs` (já existentes, idempotentes, reexecutados no início desta sessão) — clínica `QA Clinic A`, `qa.admina@example.test` (ADMIN), `qa.pacientea@example.test` / `qa.pacientea2@example.test` (PATIENT), senha `QaTenant#2026`.
- 2 `Appointment` `PENDING_PATIENT` extras criados ad hoc via Prisma (não commitados em script) para ter pendências reais de confirmar em cada perna do teste (`1a` e `1b`), já que a fixture existente só trazia uma.
- Para o cenário 4b (sessão válida apontando para usuário deletado), gerei um JWT `HS256` válido assinado com o `NEXTAUTH_SECRET` local do `.env` do projeto (mesmo formato que `lib/mobile-tokens.ts` usa para o bearer token mobile), com `sub` = id bem-formado mas inexistente no banco. `/api/patient/*` está em `MOBILE_API_PREFIXES` no `middleware.ts`, então o bearer token é aceito nessas rotas sem depender de cookie de sessão — permitiu testar o caso "sessão válida, usuário sumiu" sem mexer em internals do NextAuth. Não ficou nada persistido no banco por isso (só um JWT efêmero, expira em 15 min).

## Detalhes

### 1. `POST /api/patient/appointments/confirm-schedule`

Código lido em `app/api/patient/appointments/confirm-schedule/route.ts`: guard `if (effective.isImpersonating) return 403 { error: "Cannot confirm schedule while impersonating" }` logo após o guard de role, antes de tocar em `Appointment`/`ClinicMessage`.

**1a — paciente real (regressão).** Login via UI (Playwright) como `qa.pacientea@example.test`, `fetch()` no contexto do browser (cookies httpOnly de sessão).

```
POST /api/patient/appointments/confirm-schedule  body: {}
→ 200 { "confirmed": 2 }
```

Contagem de `ClinicMessage` do paciente antes/depois: `7 → 8` (uma mensagem nova, agregando as 2 confirmações, como o código faz — 1 `ClinicMessage` por chamada, não por agendamento). Contagem de `Appointment PENDING_PATIENT`: `2 → 0`. Comportamento idêntico ao já aprovado no QA anterior — sem regressão.

**1b — staff impersonando `qa.pacientea` (bloqueio).** Login como `qa.admina@example.test`, `POST /api/admin/impersonate {"patientId":"cmu6aoc360009xz8oyncztycs"}` → `200`. Criei antes um 3º `Appointment PENDING_PATIENT` (`cmu8b6tj00001xz8sxmgj4ob5`) para garantir que havia algo confirmável se o bloqueio falhasse.

```
POST /api/patient/appointments/confirm-schedule  body: {}
→ 403 { "error": "Cannot confirm schedule while impersonating" }
```

Verificação no banco logo depois:

```json
{ "msgCount": 8, "outcomeCount": 4, "recCount": 3, "pendingAppts": 1, "apptCStatus": "PENDING_PATIENT" }
```

`msgCount` continua `8` (nenhuma `ClinicMessage` nova) e o `Appointment` de teste continua `PENDING_PATIENT` (não foi confirmado). O bloqueio ocorre antes de qualquer leitura/escrita em `Appointment`, então nem a query `updateMany` chegou a rodar.

### 2. `POST /api/patient/outcome-measures`

Código lido em `app/api/patient/outcome-measures/route.ts`: mesmo padrão, guard de impersonação logo após o guard de role, antes do `prisma.user.findUnique` e do `create`.

**2a — paciente real (regressão, usado pelo card de check-in semanal).**

```
POST /api/patient/outcome-measures  body: { vasScore: 3, faamAdl: 90, faamSport: 85, overallFunction: 8 }
→ 200 { success: true, measures: { id: "cmu8b6823...", patientId: "cmu6aoc360009xz8oyncztycs", clinicId: "cmu6aoc2j0000xz8oaserpn4m", vasScore: 3, ... } }
```

`GET /api/patient/outcome-measures` (mesma sessão, antes do POST) → `200 { measures: { vasScore: 2, ... } }` — confirma que o GET também segue funcionando normalmente para o paciente real. `PatientOutcomeMeasure` count: `3 → 4`.

**2b — staff impersonando (bloqueio).**

```
POST /api/patient/outcome-measures  body: { vasScore: 1, faamAdl: 99, faamSport: 99, overallFunction: 10 }
→ 403 { "error": "Cannot record outcome measures while impersonating" }
```

`PatientOutcomeMeasure` count depois: `4` (sem alteração — nenhum registro novo). `GET /api/patient/outcome-measures` sob impersonação continua `200` (guard não afeta leitura, como esperado).

### 3. `POST /api/patient/consultation-recording`

Código lido em `app/api/patient/consultation-recording/route.ts`: mesmo padrão, guard antes de `formData()`/`create`.

**3a — paciente real (regressão).** Upload via `fetch()` com `FormData` (áudio fake, 8 bytes) como `qa.pacientea`:

```
POST /api/patient/consultation-recording
→ 200 { success: true, recording: { id: "cmu8b6cx8...", patientId: "cmu6aoc360009xz8oyncztycs", clinicId: "cmu6aoc2j0000xz8oaserpn4m", ... } }
```

`ConsultationRecording` count: `2 → 3`. `GET /api/patient/consultation-recording` → `200`, `recordings.length: 3`.

**3b — staff impersonando (bloqueio).**

```
POST /api/patient/consultation-recording  (FormData com áudio fake)
→ 403 { "error": "Cannot upload a recording while impersonating" }
```

`ConsultationRecording` count depois: `3` (sem alteração).

**Nenhuma das 3 rotas grava em `AuditLog`** (confirmado lendo o código — nenhuma delas importa/chama `auditLog`), então a evidência de "nenhum registro criado" está inteiramente coberta pelas contagens de `ClinicMessage`/`PatientOutcomeMeasure`/`ConsultationRecording` acima, feitas por consulta direta ao banco antes e depois de cada chamada bloqueada.

### 4. `GET /api/patient/outcome-measures` e `GET /api/patient/adherence` — guard de usuário existente

Código lido em ambos: logo após o guard de role, `const userExists = await prisma.user.findUnique({ where: { id: effective.userId }, select: { id: true } }); if (!userExists) return 404 { error: "User not found" };`.

**4a — usuário existente, com e sem dados.**

- `qa.pacientea` (tem dados): `GET /outcome-measures → 200 { measures: {...} }`, `GET /adherence → 200 { series: [...] }` — cobertos nos testes de regressão dos itens 1–3 acima.
- `qa.pacientea2` (existe no banco, **sem nenhum registro**) — testado via bearer token JWT assinado para o id real `cmu6aoc3a000bxz8obxwuamqh`:

```
$ curl -H "Authorization: Bearer <token-pacienteA2>" http://localhost:4210/api/patient/outcome-measures
{"measures":null}
STATUS:200

$ curl -H "Authorization: Bearer <token-pacienteA2>" http://localhost:4210/api/patient/adherence
{"series":[]}
STATUS:200
```

Confirma que "usuário existe mas não tem registros" continua devolvendo `200` com dado vazio/nulo — não `404`. O guard novo distingue corretamente "usuário sumiu" de "usuário sem dados ainda".

**4b — sessão válida para usuário que não existe mais no banco.** Simulado com um JWT bearer válido (mesmo formato/algoritmo/segredo do token mobile real, assinado com o `NEXTAUTH_SECRET` local) apontando para um `sub` bem-formado mas inexistente:

```
$ curl -H "Authorization: Bearer <token-usuario-inexistente>" http://localhost:4210/api/patient/outcome-measures
{"error":"User not found"}
STATUS:404

$ curl -H "Authorization: Bearer <token-usuario-inexistente>" http://localhost:4210/api/patient/adherence
{"error":"User not found"}
STATUS:404
```

Ao contrário do que eu esperava ser inviável de simular "sem mexer em internals do NextAuth" — deu para testar de forma limpa porque `/api/patient/*` aceita bearer token (`MOBILE_API_PREFIXES` no `middleware.ts`), então não precisei tocar em cookies/sessão do NextAuth, só assinar um JWT no mesmo formato que o app mobile já usa. Comportamento correto nos dois endpoints: `404 { error: "User not found" }`, não uma lista/objeto vazio disfarçando o problema.

## Erros de console

Nenhum erro real de JavaScript durante os testes. Os únicos 3 `[ERROR]` capturados no console do browser durante a impersonação são os próprios `fetch()` de teste recebendo `403` de propósito (`Failed to load resource: the server responded with a status of 403`) — ruído esperado do teste, não erro do app.

## Build

```
$ npx tsc --noEmit -p . 2>&1 | grep -v "^reconstruir/" | grep -c "error TS"
1898
```

Igual à baseline (1898, mesmo valor do QA anterior). Os únicos erros de TS dentro de um arquivo tocado por esta correção são os 5 já documentados em `consultation-recording/route.ts` (agora nas linhas 42–45, deslocadas por causa do guard de impersonação adicionado acima — mesmo `error TS2339: Property 'get' does not exist on type 'FormData'`, pré-existente, não relacionado a esta mudança). Nenhum erro novo introduzido pelas 4 correções.

## Falhas e recomendações

Nenhuma falha encontrada nas 4 correções. Todos os 8 cenários pedidos (4 itens × regressão/bloqueio ou existente/inexistente) mais os 2 extras de regressão (GET sob impersonação, cenário 4b via bearer token) passaram com evidência real de API + banco.

Uma observação sem ação necessária: as 3 rotas de escrita bloqueadas (`confirm-schedule`, `outcome-measures` POST, `consultation-recording` POST) não escrevem em `AuditLog` nem no sucesso nem no bloqueio — se a clínica quiser rastrear tentativas de escrita bloqueadas por impersonação para auditoria de segurança, hoje elas não deixam nenhum rastro (nem mesmo um log de "tentativa bloqueada"). Fora do escopo desta correção, reporto para avaliação.

## Limpeza

Fixtures e os 3 `Appointment` extras criados para este QA ficaram no banco local (idempotente reexecutando os scripts `scripts/qa/tenant-fixtures.cjs` e `scripts/qa/impersonation-fix-fixtures.cjs`; os 3 `Appointment` ad hoc não têm script de cleanup dedicado — IDs: `cmu8b4yzt0001xz548onzxmrv`, `cmu8b6tj00001xz8sxmgj4ob5`, mais o `pendingAppointmentId` original da fixture, todos já `CONFIRMED` ou consumidos). Sem necessidade de rollback para QA local.
