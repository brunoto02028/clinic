# QA Report — T-7: Gating + vocab + guardas de rota

**Data:** 2026-09-11 · Não é uma rodada de QA própria — consolida as evidências de gating/regressão das rodadas T-4/T-5 (web) e T-6 (mobile) + code review.

**Resultado: ✅ APROVADO** — nutrição é 100% personal-only; clínica/paciente clínico não vê nem acessa; sem regressão.

## Evidências

**Web (report-t-4-t-5.md):**
- Cenário 9: tenant CLINIC — ficha do paciente **sem** aba "Nutrition". ✅
- Cenário 14: paciente CLINIC — **sem** seção "Nutrition" no sidebar; `/dashboard/nutrition` direto → **redirect `/dashboard`** (guarda `isPersonalTenant`). ✅
- Regressão: abas Workouts/Assessments e fluxo clínico intactos; 0 warnings de console. ✅

**Mobile (report-t-6.md):**
- Cenário 2: `GET /api/mobile/modules` para tenant CLINIC **não** contém `nutricao`; só personal recebe. ✅

**API (report-t-3.md):**
- Cenário 8: rotas `/api/admin/meal-plans` bloqueadas para tenant CLINIC (gate TRAINING → 404). ✅
- Cenário 7: isolamento tenant/aluno (404 cross-tenant/cross-student). ✅

**Code review:** confirmou gating sem vazamento — sidebar dropa `personalOnly` para clínica; aba e TabsContent envoltos em `{isPersonal && …}`; guarda server-side na página; contrato API↔componentes consistente.

## Superfícies e seus gates
| Superfície | Gate |
|---|---|
| Aba "Nutrition" na ficha | `{isPersonal && …}` |
| Seção portal `/dashboard/nutrition` | `personalOnly` (sidebar) + guarda server-side na page |
| `/api/admin/meal-plans` (+[id]) | `assertNutritionAccess` (gate TRAINING) |
| `/api/meal-plans` (+logs) aluno | `assertStudentNutritionAccess` + ownership |
| Módulo mobile `nutricao` | só tenant personal + `trainingOn` |

**Guarda de rota inversa:** `/dashboard/nutrition` redireciona não-personal (page guard); não há rota admin top-level de nutrição (é aba). Vocab: termos de nutrição neutros; relabel aplicado onde há vocab clínico adjacente.
