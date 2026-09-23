# QA Report — Atividade 072: Fatura estruturada + área de organização

Duas rodadas. A primeira (28 cenários da `qa-spec.md`, T-1 a T-5) achou 2 bugs
reais (1 crítico) e uma contradição entre o `plan.md` e o código sobre
assinaturas Stripe. Os bugs foram corrigidos, a contradição foi esclarecida
com o Bruno e a documentação corrigida. A segunda rodada (acompanhamento)
confirmou os fixes e reteste de regressão, sem achados novos.

## Rodada 1 — 24/28 aprovados, 2 falhas, 1 contradição

| # | Cenário | Resultado |
|---|---|---|
| T1-1 | 20 gerações paralelas, mesma clínica → sequência contígua | ✅ |
| T1-2 | Gerações paralelas em clínicas diferentes → sem interferência | ❌ crítico — ver Bug 1 |
| T1-3 | Módulo BA One intocado | ✅ |
| T2-4/5/6/7/8 | Geração (avulsa/agendamento/assinatura), override, tenant isolation | ✅ |
| T2-9 | Stripe automático — agendamento pago | ✅ |
| T2-10 | Stripe automático — assinatura | ❌ contradição — ver abaixo |
| T2-11 | Backfill histórico | ✅ |
| T3-9/10/11/12 | Sincronização de status no ciclo de e-mail | ✅ |
| T4-13/14/16/17/18/19/20/21/22 | UI de faturas, filtros, edição, PDF, tenant | ✅ |
| T4-15 / T5-26 | Filtro/exibição "Overdue" | ❌ — ver Bug 2 |
| T5-23/24/25/27 | Marcar paga/void, tenant | ✅ |

### Bug 1 (crítico): `invoiceNumber` colidia entre clínicas diferentes
`PatientInvoice.invoiceNumber` era `@unique` globalmente, mas o contador
(`Clinic.nextInvoiceSeq`) é por clínica — toda segunda clínica a gerar uma
fatura colidia com a primeira (500, `Unique constraint failed`), e o número
era consumido mesmo na falha (furo permanente na sequência).

**Fix:** `prisma/schema.prisma` — `invoiceNumber` sem `@unique` no campo,
`@@unique([clinicId, invoiceNumber])` no lugar. Duas clínicas podem ter o
mesmo número (`BPR-2026-000001` nas duas) sem colisão — correto, já que
toda leitura é escopada por `clinicId`.

### Bug 2: filtro "Overdue" sempre retornava vazio
`GET /api/admin/invoices?status=OVERDUE` comparava literalmente contra a
coluna, que nunca vale `"OVERDUE"` (calculado só no client). **Fix:**
`app/api/admin/invoices/route.ts` — `status=OVERDUE` agora filtra
`status: "SENT", dueDate: { lt: now }`.

### Contradição de design: assinatura Stripe e o cron mensal
`plan.md` dizia que assinatura Stripe deveria nascer `PAID` automaticamente
via o cron de assinatura — mas o cron já excluía assinaturas Stripe do
filtro (comportamento anterior a esta atividade, não alterado), então
nenhum `PatientInvoice` era criado pra elas por esse caminho. **Resolvido**:
perguntado ao Bruno, confirmado manter como está — Stripe cuida da própria
cobrança dessas assinaturas, sem duplicar em `PatientInvoice`. `plan.md` e
`qa-spec.md` corrigidos pra refletir isso.

## Rodada 2 — acompanhamento dos fixes, aprovado sem achados novos

- **Bug 1**: confirmado corrigido — duas clínicas fixture novas geraram
  `BPR-2026-000001` cada uma, ambas com sucesso, sem erro 500, linhas
  distintas confirmadas por SELECT.
- **Bug 2**: confirmado corrigido — fatura `SENT` com `dueDate` vencido
  aparece no filtro Overdue (API e UI); `SENT` com `dueDate` futuro ou nulo
  não aparece. Screenshot:
  `screenshots/t072v2-finance-invoices-overdue-filter.png`.
- **Regressão (amostra, 4 cenários)**: fatura avulsa sem Stripe → `DRAFT`;
  `Payment.amount` batendo com `Appointment.price` → `PAID` automático
  (fix do code review, também confirmado); valores divergentes → `DRAFT`
  (não marca como paga incorretamente); UI da aba Invoices funcionando sem
  erros de console; isolamento de tenant intacto em toda rota nova.

## Ambiente e limpeza

Ambas as rodadas usaram `bpr_clinic_local`, fixtures claramente rotuladas
(`qa072-*`, `qa072v2-*`), todas removidas ao final e confirmadas por SELECT
(0 registros residuais). Um cuidado registrado pela rodada 1: havia um dev
server de OUTRO worktree (`app_clinic`, branch
`brunoto02028/motor_acompanhamento`) rodando na porta 4000 — os primeiros
testes foram sem querer disparados contra ele; corrigido subindo o servidor
certo em porta dedicada. A rodada 2 already sabia disso e evitou o mesmo
problema desde o início.

`tsc --noEmit` e `eslint` limpos em todos os arquivos da atividade nas duas
rodadas (erros pré-existentes só em `mobile/`, scripts de seed antigos e
`reconstruir/`, nada relacionado).

## Resultado final

✅ **Aprovado.** T-1 a T-5 prontas para code review final (já feito, GO) e
deploy.
