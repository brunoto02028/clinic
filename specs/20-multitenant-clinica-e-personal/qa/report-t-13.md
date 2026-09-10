# QA T-13 — Entrada do aluno no tenant

**Atividade:** specs/20-multitenant-clinica-e-personal
**Tarefa:** T-13 (Entrada do aluno no tenant)
**Data:** 2026-09-10
**Ambiente:** dev server local http://localhost:4193 (banco `bpr_clinic_local`, `DEFAULT_CLINIC_SLUG=bruno-physical-rehabilitation`, `OUTBOUND_MODE=sink`). Produção não foi tocada.
**Resultado geral:** ✅ **APROVADO** (6/6 cenários testáveis passaram; item de app mobile não verificável aqui)

## Tabela de cenários

| # | Cenário | Tipo | Esperado | Resultado |
|---|---------|------|----------|-----------|
| 1 | `POST /api/mobile/register` sem `tenantSlug` | API | 201, `clinicId` não nulo (tenant padrão) | ✅ PASS |
| 2 | `POST /api/mobile/register` com slug inexistente `does-not-exist-xyz` | API | 404, nenhum usuário criado | ✅ PASS |
| 3 | `POST /api/mobile/register` com slug ativo `bruno-physical-rehabilitation` | API | 201, `clinicSlug == bruno-physical-rehabilitation` | ✅ PASS |
| 4 | `/join/bruno-physical-rehabilitation` | UI | Carrega (200), form "Create Account" + banner "You're joining …" | ✅ PASS |
| 5 | `/join/nao-existe-xyz` | UI | Página 404 (not found) | ✅ PASS |
| 6 | `/signup` (regressão) | UI | Form público carrega SEM banner de tenant | ✅ PASS |
| — | App mobile: campo "Professional code" no cadastro | App | opcional | ⚠️ NÃO VERIFICADO (sem device; fora do alcance deste QA) |

## Detalhes e evidências

### 1. Register sem tenantSlug → tenant padrão ✅
**Comando:**
```
curl -X POST http://localhost:4193/api/mobile/register \
  -d '{"firstName":"Qa","lastName":"RegUi1","email":"qa.reg-ui1@example.test","password":"QaTenant#2026"}'
```
**Obtido:** `HTTP_STATUS:201`. Body `user`:
```json
"clinicId":"cmqdug2j40000xzz04bma5dk8","clinicName":"Bruno Physical Rehabilitation","clinicSlug":"bruno-physical-rehabilitation","clinicType":"CLINIC"
```
`clinicId` não nulo, caiu no tenant padrão. Conforme (fecha ISO-10).

### 2. Register com slug inexistente → 404, sem usuário ✅
**Comando:** `... -d '{...,"tenantSlug":"does-not-exist-xyz"}'`
**Obtido:** `HTTP_STATUS:404`, body `{"error":"Invalid professional code"}`.
Confirmado na limpeza que **nenhum** usuário `qa.reg-bad@example.test` foi criado.

### 3. Register com slug ativo → clinicSlug correto ✅
**Comando:** `... -d '{...,"tenantSlug":"bruno-physical-rehabilitation"}'`
**Obtido:** `HTTP_STATUS:201`, `user.clinicSlug == "bruno-physical-rehabilitation"`, `clinicId == cmqdug2j40000xzz04bma5dk8`. Conforme.

### 4. `/join/bruno-physical-rehabilitation` ✅
Testado como visitante anônimo (a página redireciona sessões logadas para `/dashboard`). Snapshot mostra:
- heading "Create Account"
- parágrafo: **"You're joining Bruno Physical Rehabilitation"** (`<strong>` com o nome do tenant)
- form de cadastro (First/Last name, Continue, Sign up with Google)

Evidência: `qa/screenshots/t-13-join-bpr-ok.png`

### 5. `/join/nao-existe-xyz` → 404 ✅
`Page Title: 404: This page could not be found.` / `HTTP status: 404 Not Found`.
Evidência: `qa/screenshots/t-13-join-inexistente-404.png`

### 6. `/signup` regressão ✅
Form "Create Account" carrega normal, **sem** o parágrafo "You're joining …" (presente apenas no /join). Regressão OK.
Evidência: `qa/screenshots/t-13-signup-sem-banner.png`

## Erros de console
Nenhum erro de JS atribuível às páginas `/join` ou `/signup`. Erros capturados no log (`Warning: unique "key" prop` e hydration `<a>` em `PatientsList`) são **pré-existentes e fora do escopo da T-13** (correspondem à T-9 do plano).

## Limpeza
Removidos via Prisma (banco local): `qa.reg-ui1@example.test`, `qa.reg-bpr@example.test`. `qa.reg-bad@example.test` nunca foi criado. Nenhum resíduo.

## Observações
- Item 4 da spec (campo "código do seu profissional" no app mobile) não é testável neste ambiente (sem device, `mobile/` sem `node_modules`) — registrado como não verificado, não como falha. A mudança é trivial e espelha os `Input` irmãos da mesma tela.
- A rota trata corretamente o caso "sem slug e sem tenant padrão" retornando 503 (não `null`), não exercitado pois o ambiente tem `DEFAULT_CLINIC_SLUG`.

**Conclusão: APROVADO.**
