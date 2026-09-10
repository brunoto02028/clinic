# QA T-23 (backend) — Módulo Treino no app: API mobile

**Atividade:** specs/20-multitenant-clinica-e-personal
**Tarefa:** T-23 — sub-parte backend (endpoints mobile + gating do módulo). As telas do app seguem em entrega separada.
**Data:** 2026-09-10
**Ambiente:** banco local; dev server local :4198 (`OUTBOUND_MODE=sink`). Produção não tocada.
**Resultado:** ✅ **APROVADO** (runtime 36/36)

## Entregue
- `lib/mobile-actor.ts` — `getMobileActor(request)`: verifica o Bearer, recarrega role/clinicId do banco e constrói o mesmo `Actor` do `tenant-access`, para os endpoints mobile reusarem os helpers da T-20/T-22.
- `app/api/mobile/workouts/route.ts` — GET dos treinos do próprio aluno (Bearer).
- `app/api/mobile/workouts/[id]/logs/route.ts` — POST registra sessão + GET histórico (Bearer), com as mesmas guardas da T-22 (posse por `studentId`, módulo TRAINING on, séries do próprio treino, faixas validadas, treino inativo → 404, body vazio → 400).
- `app/api/mobile/modules/route.ts` — passa a devolver o módulo `treino` **só quando o tenant tem TRAINING on** (default-on no personal); a clínica não vê. Aplicado tanto no caminho admin/full-access quanto no normal.

## Evidência — suíte runtime (`npm run test:tenants`) → **36/36**
```
M1 personal student modules include treino   — 200
M2 clinic patient modules exclude treino      — 200
M3 mobile student lists own workouts          — 200
M4 mobile student logs a session              — 201
M5 clinic patient → mobile workouts 404       — 404
```
(+ ISO/gate/W/S/S3b/S3c/ISO-10 seguem passando — sem regressão.)

## Escopo / limites
- As **telas do app** (`mobile/app/(treino)`) e o wiring no `module-select` são entrega separada — o `mobile/` não tem toolchain instalada aqui e o app **não sobe pelo push** (precisa de build EAS). QA de UI do app fica via `expo start --web`/device, fora do alcance desta sessão.
- O backend, este sim, entra em produção pelo push (com a web).

## Respostas ao code review (5 achados)
| # | Achado | Disposição |
|---|--------|-----------|
| 1 | `modules` falhava aberto p/ usuário desativado (não checava `isActive`) | ✅ refatorado para usar `getMobileActor` (checa `isActive`, falha fechado). |
| 2 | Parse de Bearer case-sensitive em `modules` (divergia de `getMobileActor`) | ✅ resolvido pelo mesmo refactor (case-insensitive). |
| 3 | `modules` duplicava o prólogo de auth em vez de reusar `getMobileActor` | ✅ agora reusa; só busca `moduleOverrides`/`fullAccessOverride` à parte. |
| 4 | Mapeamento AccessError→corsJson com round-trip de JSON (4 handlers) | ✅ `corsJson({error: err.message}, {status: err.status})` direto. |
| 5 | GET histórico não checa `isActive` (assimetria com o POST) | ✅ **intencional** — documentado: treino inativo não aceita log (POST→404) mas o histórico já gravado continua legível ao dono (idem na rota web). |

Correções verificadas: `tsc` limpo + runtime **36/36** mantido (M1–M5) após o refactor.

**Conclusão: APROVADO** (backend). Deployável.
