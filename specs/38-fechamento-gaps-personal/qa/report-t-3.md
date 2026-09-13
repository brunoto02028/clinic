# QA Report — T-3: Limites de plano por tenant

**Data:** 13/09/2026
**Resultado geral:** ✅ aprovado

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 10 | UI — SUPERADMIN define limite de pacientes, persiste após reload | UI | ✅ |
| 10b | UI — campo em branco ("No limit") quando tenant não tem Subscription | UI | ✅ |
| 11 | API — bloqueio no limite (paciente, `/api/signup`) | API | ✅ |
| 11b | API — bloqueio no limite (paciente, `/api/admin/patients` POST) | API | ✅ |
| 12 | API — abaixo do limite, permite (paciente) | API | ✅ |
| 13 | API — sem limite configurado, sem enforcement (paciente, 3 cadastros) | API | ✅ |
| — | API — bloqueio no limite (staff, `/api/admin/users` POST) | API (derivado) | ✅ |
| — | API — abaixo do limite, permite (staff) | API (derivado) | ✅ |
| — | API — sem limite configurado, sem enforcement (staff, 2 cadastros) | API (derivado) | ✅ |
| Suposição 4 | Reduzir limite abaixo da contagem atual não afeta quem já existe, só bloqueia cadastro novo | API + DB | ✅ |

Cenários de staff (checkTherapistLimit via `/api/admin/users`) não estão explicitamente numerados na qa-spec, mas foram derivados por instrução direta do desenvolvedor — mesmo mecanismo do limite de pacientes, endpoint diferente.

## Ambiente e fixtures
- Servidor dev local: `http://localhost:4000`.
- Tenants de teste recriados via `node scripts/qa/tenant-fixtures.cjs` (idempotente): `qa-clinic-a` (CLINIC) e `qa-studio-pt` (PERSONAL_TRAINER), senha `QaTenant#2026` para todas as contas `@example.test`.
- Contagens reais no início do QA (havia uma sobra de uma sessão de QA anterior — usuário `qa.crosstenant.20260912@example.test` em `qa-clinic-a`, não relacionado a esta tarefa): `qa-clinic-a` com **3 pacientes / 2 staff**, `qa-studio-pt` com **3 pacientes / 1 staff**. Nenhum dos dois tenants tinha `Subscription` configurada (limite = "sem limite", comportamento de hoje).
- Login via UI (Playwright) como `qa.superadmin@example.test` para os testes de UI; login via `curl` (CSRF + `callback/credentials`) como `qa.superadmin`, `qa.admina` (ADMIN de `qa-clinic-a`) e `qa.trainer` para os testes de API.
- `/api/signup` exige Turnstile — sem `TURNSTILE_SECRET_KEY` configurado, o backend cai no secret de teste do Cloudflare (sempre aprova), então os cadastros de teste incluíram um `turnstileToken` placeholder. Também usei `X-Forwarded-For` distinto por cenário para não estourar o rate limit de 5 cadastros/hora por IP do `/api/signup` (não é do escopo da T-3, é proteção anti-bot da atividade 16).

## Detalhes

### 10. UI — SUPERADMIN define limite, persiste ✅
- **Passos:** login como `qa.superadmin@example.test` → `/admin/clinics` → menu de ações de "QA Clinic A" → "Clinic Settings" → campo "Max patients / students" = `3` → Save → toast "Clinic settings saved" → **reload completo da página** (não SPA) → reabrir "Clinic Settings" de QA Clinic A.
- **Obtido:** confirmado — snapshot de acessibilidade pós-reload mostra `spinbutton "Max patients / students": "3"`. O toggle "Instagram Import" permaneceu inalterado, provando que o save não pisou em outros campos.
- **Evidência:** `specs/38-fechamento-gaps-personal/qa/screenshots/t-3-clinic-settings-persisted-qa-clinic-a.png`

### 10b. UI — campo em branco quando não há limite ✅
- **Passos:** abrir "Clinic Settings" de `qa-studio-pt` (tenant sem `Subscription` na fixture).
- **Obtido:** confirmado — ambos os campos mostram o placeholder cinza "No limit", input vazio.
- **Evidência:** `specs/38-fechamento-gaps-personal/qa/screenshots/t-3-clinic-settings-blank-qa-studio-pt.png`

### 11. API — bloqueio no limite (paciente) ✅
- **Setup:** `qa-clinic-a` com `maxPatients=3`, contagem atual = 3 (no limite).
- **Comando:**
  ```
  curl -s -i -X POST http://localhost:4000/api/signup \
    -H "Content-Type: application/json" \
    -H "X-Forwarded-For: 10.10.10.11" \
    -d '{"email":"qa.newpatient1@example.test","password":"Patient123!","firstName":"QA","lastName":"NewPatient1","tenantSlug":"qa-clinic-a","turnstileToken":"XXXX.DUMMY.TOKEN.XXXX"}'
  ```
- **Obtido:**
  ```
  HTTP/1.1 403 Forbidden
  {"error":"This account has reached its plan's patient limit. Contact the platform administrator to increase it."}
  ```

### 11b. API — bloqueio no limite via rota de staff (`/api/admin/patients` POST) ✅
- **Setup:** `qa-clinic-a` com `maxPatients=1`, contagem atual = 4 (bem acima do limite, ver Suposição 4 abaixo).
- **Comando:**
  ```
  curl -s -i -b cookies_adminA.txt -X POST http://localhost:4000/api/admin/patients \
    -H "Content-Type: application/json" \
    -d '{"firstName":"QA","lastName":"NewPatient4Admin","email":"qa.newpatient4admin@example.test"}'
  ```
  (sessão logada como `qa.admina@example.test`, ADMIN de `qa-clinic-a`)
- **Obtido:**
  ```
  HTTP/1.1 403 Forbidden
  {"error":"This account has reached its plan's patient limit. Contact the platform administrator to increase it."}
  ```

### 12. API — abaixo do limite, permite (paciente) ✅
- **Setup:** `PATCH /api/admin/clinics/{clinicA}` com `{"maxPatients":4}` (contagem atual = 3, abaixo do novo limite) → `HTTP 200`.
- **Comando:**
  ```
  curl -s -i -X POST http://localhost:4000/api/signup \
    -H "Content-Type: application/json" \
    -H "X-Forwarded-For: 10.10.10.12" \
    -d '{"email":"qa.newpatient2@example.test","password":"Patient123!","firstName":"QA","lastName":"NewPatient2","tenantSlug":"qa-clinic-a","turnstileToken":"XXXX.DUMMY.TOKEN.XXXX"}'
  ```
- **Obtido:** `HTTP/1.1 200 OK`, `{"success":true,"message":"Account created successfully",...}`. Tenant passa a ter 4 pacientes.

### 13. API — sem limite configurado, sem enforcement (paciente) ✅
- **Setup:** `qa-studio-pt`, sem `Subscription`.
- **Comando:** 3 chamadas seguidas a `POST /api/signup` com `tenantSlug: "qa-studio-pt"`.
- **Obtido:** as 3 retornaram `HTTP 200` com `success:true`, nenhuma bloqueada.

### Staff — bloqueio no limite (`/api/admin/users` POST) ✅
- **Setup:** `qa-clinic-a` com `maxTherapists=2`, contagem atual (ADMIN+THERAPIST) = 2 (no limite).
- **Comando:** `POST /api/admin/users` (sessão SUPERADMIN, `targetClinicId` de `qa-clinic-a`).
- **Obtido:**
  ```
  HTTP/1.1 403 Forbidden
  {"error":"This account has reached its plan's staff limit. Contact the platform administrator to increase it."}
  ```

### Staff — abaixo do limite, permite ✅
- **Setup:** `PATCH` `maxTherapists=3` (contagem atual = 2) → `HTTP 200`.
- **Obtido:** `HTTP/1.1 201 Created`, novo THERAPIST criado.

### Staff — sem limite configurado, sem enforcement ✅
- **Setup:** `qa-studio-pt`, sem `Subscription`.
- **Obtido:** 2 chamadas a `POST /api/admin/users`, ambas `HTTP 201 Created`, nenhuma bloqueada.

### Suposição 4 — reduzir limite abaixo da contagem atual não afeta quem já existe ✅
- **Setup:** `qa-clinic-a` com 4 pacientes. `PATCH` com `{"maxPatients":1}` (bem abaixo de 4) → `HTTP 200`.
- **Verificação 1:** os 4 pacientes existentes continuam intactos e listados normalmente via `GET /api/admin/patients` como ADMIN do tenant (nenhum desativado/deletado pelo enforcement).
- **Verificação 2:** só cadastro NOVO é bloqueado — `POST /api/signup` e `POST /api/admin/patients` retornam `403` no mesmo tenant.
- **Resultado:** exatamente o comportamento descrito no plano e no texto do próprio diálogo de UI.

## Erros de console
10 warnings/erros de hydration do React (`Logo` dentro de `AdminMiniSidebar`) apareceram em toda navegação de `/admin/clinics`, já presentes imediatamente após o login, ANTES de qualquer interação com o diálogo "Clinic Settings" — não variam com as ações testadas, não são causados pela T-3. Reportado por completude; não é regressão desta tarefa.

## Falhas e recomendações
Nenhuma falha encontrada nos critérios de aceite da T-3.
- **Observação não-bloqueante, fora do escopo:** o warning de hydration acima aparece em toda carga de `/admin/clinics` (não exclusivo do dev mode) — vale um follow-up rápido em outra tarefa.

## Limpeza
`node scripts/qa/tenant-cleanup.cjs` executado ao final: removeu os 2 tenants de teste (com suas `Subscription`s via cascade), 22 usuários `qa.*@example.test` (incluindo uma sobra de uma sessão de QA anterior não relacionada) e todos os registros dependentes. `leftover fixtures: 0` confirmado. A `Subscription` real de "Bruno Physical Rehabilitation" (`maxTherapists=999`/`maxPatients=9999`, pré-existente desde 19/08/2026) não foi tocada em nenhum momento deste QA.

---

## Segunda rodada de code review — correções

Uma segunda passada de code review achou 4 problemas reais, todos corrigidos, mais 2 achados fora do escopo (pré-existentes, não tocados):

1. **Corrigido — cadastro pelo app mobile ignorava o limite.** `app/api/mobile/register/route.ts` (self-registration do app mobile) cria pacientes pelo mesmo fluxo `resolveJoinTenant`, mas nunca chamava `checkPatientLimit` — um tenant no limite continuava aceitando cadastros vindos do app. Corrigido: mesma guarda adicionada, logo antes do `bcrypt.hash`/`user.create`.
2. **Corrigido — bypass do limite de pacientes via rota de staff.** `POST /api/admin/users` (criação de STAFF) aceitava `role: "PATIENT"` no corpo sem validar — um paciente criado por essa rota nunca passava por `checkPatientLimit` (só chamada nessa rota pra `checkTherapistLimit`, que só conta ADMIN/THERAPIST) nem por `checkTherapistLimit` de forma significativa, evadindo o limite de pacientes por completo. Corrigido: a rota agora rejeita (400) qualquer `role` que não seja `ADMIN`/`THERAPIST` — criar paciente é `/api/admin/patients`, não esta rota.
3. **Corrigido — save do Clinic Settings não era atômico.** `PATCH /api/admin/clinics/[id]` fazia `clinic.update` e `subscription.upsert` como duas escritas separadas — se a segunda falhasse, a primeira já tinha sido persistida silenciosamente (ex. o toggle do Instagram mudava mesmo com a resposta sendo um erro 500 "Failed to save"). Corrigido: as duas escritas agora rodam dentro de `prisma.$transaction`.
4. **Corrigido — hash de senha antes da checagem de limite.** Em `/api/signup` e `/api/mobile/register`, o `bcrypt.hash` (caro, ~100-300ms de CPU) rodava antes de resolver o tenant e checar o limite — um tenant no limite recebendo uma rajada de tentativas de cadastro gastava CPU hasheando senhas de cadastros que sempre seriam recusados. Reordenado: hash só depois de passar por todas as checagens de rejeição, incluindo o limite.

**Verificação (smoke test manual):**
- `POST /api/admin/users` com `role: "PATIENT"` (sessão SUPERADMIN descartável, criada só pro teste) → `400 Bad Request`, `{"error":"Invalid role for a staff account"}` — bypass fechado.
- `POST /api/mobile/register` num tenant real com `maxPatients=1`: primeiro cadastro → `201 Created` (count vai a 1); segundo cadastro imediato → `403 Forbidden` — limite agora respeitado pelo app mobile.
- Dados de teste (SUPERADMIN descartável, os 2 usuários mobile de teste, a `Subscription` de teste) removidos ao final; nenhum tenant real com limite alterado permanentemente.

**Não corrigidos, avaliados e descartados (fora do escopo da T-3):**
- **Race condition (TOCTOU) no `count`-depois-`compare`** de `lib/tenant-limits.ts`: duas requisições simultâneas no exato instante em que o tenant atinge o limite podem, em teoria, passar ambas e ultrapassar o limite em 1. Este é um limite de negócio "soft" por design (a própria Suposição 4 já aceita que reduzir o limite não expulsa quem já passou dele) — não uma fronteira de segurança rígida — então uma transação com lock não se justifica pelo risco real numa aplicação deste porte/tráfego. Se o volume de cadastros simultâneos crescer a ponto de importar, vale revisitar.
- **`_count.select` de `app/api/admin/clinics/route.ts` não inclui `patients`, só `users`**, mesmo a UI (`app/admin/clinics/page.tsx`) já esperando `clinic._count.patients` — bug PRÉ-EXISTENTE (já estava assim antes da atividade 38, não foi introduzido por nenhuma mudança da T-3, que só acrescentou o `subscription` ao mesmo `include`). Fora do escopo desta tarefa; reportado ao usuário como um item separado a considerar, não corrigido aqui.
