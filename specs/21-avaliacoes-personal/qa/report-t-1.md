# QA T-1 — Modelo + API de avaliações (atividade 21)

**Data:** 2026-09-10
**Ambiente:** banco local `bpr_clinic_local`; dev :4204 (`OUTBOUND_MODE=sink`). Produção não tocada.
**Resultado:** ✅ **APROVADO** (jest 13 + runtime 52/52)

## Entregue
- **Prisma (aditivo):** `StudentAssessment`, `AssessmentPhoto`, enum `BodyFatMethod`, `sex` no `User`, back-relations em Clinic/User. `db push` local ok. **`BodyAssessment` clínico intocado.**
- **`lib/body-composition.ts` (puro):** BMI, RCQ, massa magra/gorda, %GC por Jackson-Pollock 3/7 pontos → Siri (fail-closed: exige todos os sítios; clamp fisiológico), Epley 1RM.
- **`lib/assessment.ts`:** validação de faixas + `deriveAssessment` (resolve %GC por método) + `ageFromDob`.
- **API:** staff `GET/POST /api/admin/assessments` + `[id]` GET/PATCH/DELETE (tenant-scoped, 404 alheio); aluno `GET /api/assessments` (próprias) e `GET /api/mobile/assessments` (Bearer).

## Evidências
- **jest** `__tests__/personal/body-composition.test.ts` — **13/13** (BMI, RCQ, massas, JP 3/7 homem/mulher plausíveis, fallback 7-site, nulos, Epley).
- **runtime** `npm run test:tenants` — **52/52**, novos:
  - A1 grava avaliação (MANUAL) → 201 com `bmi 24.7, whr 0.8, fatMassKg 16, leanMassKg 64` (computados no servidor).
  - A2 trainer lista; A3 clínica → 404; A4 aluno de outro tenant → 404; A5 %GC inválido → 400.
  - A6 aluno vê só as próprias (web); A6b paciente da clínica → 404.
  - A7/A7b mobile (Bearer): aluno 200; paciente da clínica 404.

## Respostas ao code review (6 achados)
| # | Achado | Disposição |
|---|--------|-----------|
| 1 | PATCH destrutivo (zerava campos omitidos, resetava método) | ✅ **merge**: só sobrescreve chaves presentes; recomputa derivados do estado mesclado. |
| 2 | JP 7-pontos inalcançável (3-pontos é subconjunto) | ✅ checa 7-pontos primeiro (mais preciso); 3-pontos como fallback. Teste ajustado. |
| 3 | %GC de bioimpedância sem validação de faixa | ✅ `validateAssessment` valida `bia.bodyFatPct` 2–75 → 400 (A5b). |
| 6 | Dobra = 0 tratada como ausente (nonNeg permitia 0) | ✅ dobras/girths exigem **> 0** quando presentes → 400 (A5c). |
| 5 | Guarda `sex && age` desabilitava com idade 0 | ✅ `age != null && age > 0`. |
| 4 | GET/PATCH faziam 2 findUnique | ✅ `loadOwned` retorna a linha completa (com photos); GET/PATCH reusam. |

Verificado: jest **14/14** + runtime **54/54** (incl. A5b/A5c).

## Critérios de aceite
- [x] Cálculo de %GC (JP+Siri), BMI, RCQ, massas — testado.
- [x] Isolamento: staff só do tenant; aluno só as próprias; outro tenant → 404.
- [x] Nenhuma tabela existente alterada além do `sex` aditivo no User.

**Conclusão: APROVADO.**
