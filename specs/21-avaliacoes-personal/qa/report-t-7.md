# QA T-7 — Catálogo de tipos de avaliação do tenant

**Data:** 2026-09-10
**Ambiente:** local :4212 (banco `bpr_clinic_local`). Produção não tocada.
**Resultado:** ✅ **APROVADO** (runtime 61/61)

## Entregue
- Campo aditivo `assessmentType` (String?) em `StudentAssessment`.
- API POST/PATCH aceitam `assessmentType` (rótulo livre); PATCH preserva no merge.
- `AssessmentPanel`: dropdown "Assessment type" populado dos `TreatmentType` do tenant com categoria **ASSESSMENT_SERVICE** (via `/api/admin/treatment-types`, já tenant-scoped); só aparece se houver catálogo. O tipo é exibido como chip no histórico.

## Evidência — runtime `npm run test:tenants` → **61/61**
- **A9**: `POST /api/admin/assessments` com `assessmentType:"Full body composition"` → 201 e o valor volta no registro. Isolamento herdado (A3/A4).

## Nota
O "catálogo" reusa o modelo existente `TreatmentType` (categoria ASSESSMENT_SERVICE), gerido pela área de preços/serviços do tenant — sem modelo novo. A T-7 liga esse catálogo ao fluxo de avaliação (seleção + exibição).

## Critérios de aceite
- [x] PT vê/gere seus tipos de avaliação (via TreatmentType) e pode marcá-los numa avaliação; isolado por tenant.

**Conclusão: APROVADO.**
