# T-1: Exame independente — `reviewMode` gravado na compra

**Status:** implementada · revisada · QA pendente
**Depende de:** 081 T-1..T-4

## Objetivo

O resultado vai direto para quem só comprou um exame, e espera a liberação de quem tem terapeuta.

## Contexto

Decisões 1 e 2 do plano. Segurar o resultado de quem não tem terapeuta é guardar o que é dela
esperando uma revisão que ninguém faria.

## Passos (feitos)

1. `LabOrder.reviewMode` (`enum LabReviewMode { DIRECT THERAPIST }`, default `DIRECT`),
   `releasedToPatientAt`, `releaseNote`, `releaseNotePt`, `clinicId`.
2. `lib/lab-review-mode.ts`: `reviewModeFor(patientId, clinicId)` — consulta no histórico **ou**
   pacote ativo ⇒ `THERAPIST`, senão `DIRECT`. Mais `needsRelease`, `releasesOnArrival`,
   `nonDiagnosticCopy(reviewMode)`, `markAsClinicPatient`.
3. `lib/lab-stage.ts`: `RESULTS_READY` vira `in_review` só quando `reviewMode === "THERAPIST"`;
   senão `released`. `stageCopy.released` deixou de afirmar que um terapeuta revisou.
4. A fila de liberação do admin (`/api/admin/labs/orders/[id]/release`) passa a enxergar só
   pedidos `THERAPIST`.

## Arquivos afetados

- `prisma/schema.prisma`, `lib/lab-review-mode.ts` (novo), `lib/lab-stage.ts`,
  `lib/lab-patient.ts`, `lib/lab-admin.ts`
- `app/api/admin/labs/orders/[id]/release/route.ts`, `app/api/mobile/labs/orders/route.ts`
- `mobile/app/(app)/(lab)/result/[id].tsx`, `mobile/src/lib/lab-stage-copy.ts`
- `__tests__/labs/review-mode.test.ts`, `stage.test.ts`, `stage-copy-parity.test.ts`

## Critérios de aceite

- [x] `reviewModeFor` devolve `THERAPIST` com consulta no histórico
- [x] `reviewModeFor` devolve `THERAPIST` com pacote ativo
- [x] `reviewModeFor` devolve `DIRECT` para quem nunca foi atendido
- [x] Pedido `DIRECT` chega em `released` sem passar por `in_review`
- [x] Pedido `DIRECT` não entra na fila de liberação do admin
- [x] A frase de não-diagnóstico do `DIRECT` não afirma revisão de terapeuta
- [ ] **QA:** os seis acima medidos em produção com pedido de teste dos dois tipos
