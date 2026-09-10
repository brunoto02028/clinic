# QA T-19b (parte 1) — Gating server-side das rotas clínicas

**Atividade:** specs/20-multitenant-clinica-e-personal
**Tarefa:** T-19b — sub-parte "gating server-side" (bloquear rotas clínicas por URL para tenant personal)
**Data:** 2026-09-10
**Ambiente:** dev server local http://localhost:4193 (banco `bpr_clinic_local`, `DEFAULT_CLINIC_SLUG=bruno-physical-rehabilitation`, `OUTBOUND_MODE=sink`). Produção não tocada.
**Resultado:** ✅ **APROVADO** (100 testes jest + 20/20 na suíte de isolamento)

> Escopo entregue aqui: o **gating** (chokepoint no middleware). As outras duas partes da T-19b (questionário de prontidão e catálogo de serviços) seguem em tarefa separada por decisão do Bruno.

## Mecanismo
- `lib/clinical-routes.ts` (puro, Edge-safe): `isClinicalOnlyRoute(pathname)` — lista estática das telas/APIs clínicas + matcher por segmento para os **geradores clínicos por-paciente** (`/api/admin/patients/<id>/{protocol,protocol-revise,rehab-plan,diagnosis,evidence-report,atlas-treatment-plan,atlas-chat}`), robusto ao `[id]` dinâmico e a paths/queries à frente.
- `middleware.ts`: se `role !== SUPERADMIN` **e** `isPersonalTenant(token.clinicType)` **e** `isClinicalOnlyRoute(pathname)` → página redireciona para `/admin`, API responde `404` (sem oráculo). Fail-safe: só dispara quando o tenant é explicitamente `PERSONAL_TRAINER`; clínica e SUPERADMIN não são afetados.

## Evidências

### Unidade (jest) — `__tests__/tenant/clinical-routes.test.ts`
```
Test Suites: 9 passed, 9 total
Tests:       100 passed, 100 total
```
Cobre: rotas clínicas bloqueadas; geradores por-paciente com id dinâmico (+ path/query à frente); rotas compartilhadas (exercises, equipment, treatment-plans, patients list/record, packages, documents, messages) **não** bloqueadas.

### Runtime (suíte de isolamento) — `npm run test:tenants` → **20/20**
```
PASS  G1 personal admin → /admin/clinical-notes redirected — status 307, loc /admin
PASS  G2 personal admin → /api/admin/clinical-notes 404 — status 404
PASS  G3 personal admin → /api/admin/protocols 404 — status 404
PASS  G4 clinic admin → /admin/clinical-notes not gated — status 200, loc -
PASS  G5 personal admin → patient protocol generator 404 — status 404
PASS  G6 clinic admin → patient protocol generator not gated — status 200
```
(G4/G6 são controles: a clínica continua acessando as mesmas rotas — o gate é escopado por tipo de tenant.) As 11 cenas ISO + 3 ISO-10 continuam passando (sem regressão).

## Fixtures
`scripts/qa/tenant-fixtures.cjs`: tenant B (`qa-studio-pt`) agora é `PERSONAL_TRAINER` (antes era CLINIC por default), coerente com o papel de "tenant personal" da fixture e necessário para exercitar o gate.

## Respostas ao code review (5 achados)

| # | Achado | Disposição |
|---|--------|-----------|
| 1 | Gate não cobria geradores clínicos por-paciente (`/api/admin/patients/[id]/protocol`, etc.) | ✅ **Corrigido** — matcher por segmento adicionado; provado por G5 (runtime) + jest. |
| 4 | ISO-10a dependente de env (`DEFAULT_CLINIC_SLUG`) → não determinístico | ✅ **Corrigido** — asserção reescrita para a invariante "nunca cria conta sem tenant" (201+clinicId **ou** 503 fail-closed). |
| 5 | Cookie `join_tenant`: sem Secure, sem limpeza, janela de 10min | ✅ **Endurecido** — max-age 300s, `secure` em https, e limpeza após consumo no `signIn`. Resíduo menor (abandono dentro da janela) documentado. |
| 2 | `getDefaultClinicId()` → null com >1 clínica ativa sem `DEFAULT_CLINIC_SLUG` | ⚠️ **Comportamento intencional** (decisão D5: acabar com o `findFirst` indeterminado, falhar fechado). Hoje prod tem 1 clínica ativa → funciona. **Pré-requisito de deploy já sinalizado:** definir `DEFAULT_CLINIC_SLUG` antes de ativar um 2º tenant. Sem mudança de código. |
| 3 | JWT antigo (30d) sem `clinicType` → admin personal não gateado até relogar | ⚠️ **Sem exposição atual** — não existe tenant personal em prod hoje; todo tenant personal futuro loga fresco (token já carrega `clinicType`). Risco residual documentado; middleware é Edge (não acessa DB). Sem mudança de código. |

**Confirmações OK do review:** middleware Edge-safe (imports puros); login por credenciais popula `token.clinicType`; `Clinic.type @default(CLINIC)` mantém BPR fora do gate.

**Conclusão: APROVADO** (sub-parte gating).
