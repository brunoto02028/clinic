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

## Rodada 3 — acréscimo (fix do bug crítico de PDF desatualizado + preview/reenvio/liberdade total), aprovado sem achados

Escopo: `lib/patient-invoice-pdf.ts`, `app/api/admin/invoices/[id]/queue/route.ts`
(novo), `app/api/admin/invoices/[id]/route.ts` (PATCH agora regenera PDF e
descarta e-mail pendente desatualizado), `components/admin/finance-invoices-section.tsx`
(seção "Pending approval" no detalhe + botões "Send for approval"/"Resend").

| # | Cenário | Tipo | Resultado |
|---|---|---|---|
| 1 | Bug original fechado ponta a ponta: gerar → editar itens → e-mail antigo pra TRASH, PDF reflete novo valor, sem PENDING_APPROVAL órfão | API | ✅ |
| 2 | "Send for approval" após edição — novo e-mail com valor correto | API | ✅ |
| 3 | Aprovar direto do preview (`approveSend`) — `PatientInvoice.status` → SENT | API | ✅ |
| 4 | Descartar direto do preview (`discard`) — vai pra TRASH, botão "Send for approval"/"Resend" reaparece | API + UI | ✅ |
| 5 | Reenviar fatura já SENT — novo e-mail PENDING_APPROVAL, **mesmo** `invoiceNumber` | API | ✅ |
| 6 | Bloqueio de `/queue` em fatura VOID e em fatura PAID — 400, nada criado | API | ✅ |
| 7 | UI: abrir fatura DRAFT → seção "Pending approval" com preview em iframe → "Approve & send" → dialog e lista atualizam sozinhos pra SENT, sem reload manual → "Resend" → "Discard" | UI (Playwright) | ✅ |
| 8 | Tenant isolation em `/queue` — staff de outra clínica recebe 404, nenhum efeito colateral | API | ✅ |
| 9 | Regressão rápida: marcar paga, void, deletar draft | API | ✅ |

### Detalhes do cenário 1 (o bug que motivou o acréscimo)
Fatura avulsa gerada com item de £80.00 (e-mail PENDING_APPROVAL automático
confirmado com "£80.00" no corpo). `PATCH .../route.ts` com item de £150.00:
- e-mail antigo (`folder: PENDING_APPROVAL`) confirmado em `TRASH` por SELECT;
- `GET .../pdf` baixado e inspecionado (grep no PDF cru) — contém
  `£150.00` e a nova descrição "Physio session (extended)", não mais £80;
- SELECT em `EmailMessage where patientInvoiceId = ...` — zero linhas em
  `PENDING_APPROVAL` até o `POST .../queue` do cenário 2 recriar uma.

Confirma que o bug relatado no QA online anterior (paciente podia receber
valor diferente do que o sistema mostrava) está fechado nesse fluxo real de
API, não só na lógica isolada.

### Cenário 7 — evidência
Capturas em `screenshots/`:
`t-6b-invoice-detail-pending-approval.png` (preview + Approve&send/Discard),
`t-6b-invoice-approved-sent.png` (status SENT, seção pending sumiu, sem
reload manual), `t-6b-invoice-discarded.png` (após Discard, Resend
reaparece, delivery history mostra a entrada descartada).

Console do browser ao final do fluxo: 0 erros, 2 warnings — ambos o mesmo
aviso genérico do Radix (`Missing Description/aria-describedby for
{DialogContent}`), pré-existente em outros dialogs do app, não específico
desta feature.

### Observação menor (não bloqueante)
No histórico de entregas do detalhe da fatura, uma entrada descartada
aparece como `TRASH to <email>` (mostra o nome cru do folder), enquanto
`SENT`/`PENDING_APPROVAL` têm rótulos amigáveis ("Sent"/"Pending approval").
Cosmético — `components/admin/finance-invoices-section.tsx`, no `.map()` de
`invoice.emails`, falta um caso para `TRASH` (algo como "Discarded").

### Ambiente e limpeza (rodada 3)
`bpr_clinic_local`. O dev server local (porta 4000) precisou de restart no
início da rodada — as rotas novas (`app/api/admin/invoices/[id]/queue/`)
retornavam 404 mesmo existindo em disco e passando no `tsc`/`eslint`
(compilação Next dev não pegou os arquivos novos até reiniciar o processo).
Não é um bug do código da atividade, é um efeito colateral do ambiente local
— sinalizando aqui porque pode confundir quem repetir o teste.

Fixtures (`qa072b-*`): 1 paciente, 1 admin, 5 `PatientInvoice` (uma delas
deletada no próprio teste do cenário 9) e todos os `EmailMessage` vinculados
a eles. Todos removidos ao final; confirmado por SELECT (0 residuais nas
três tabelas) e confirmado que o admin real da clínica (`admin@bpr.rehab`)
segue intacto.

`npx tsc --noEmit` e `npx eslint` nos 4 arquivos tocados: limpos (erros
pré-existentes só em `mobile/`, `prisma/seed-marketplace.ts` e
`scripts/migrate-to-multitenant.ts`, nada relacionado a esta atividade).

## Resultado final

✅ **Aprovado.** T-1 a T-5 prontas para code review final (já feito, GO) e
deploy. Acréscimo (rodada 3) também aprovado — bug crítico de PDF/e-mail
desatualizado confirmado fechado ponta a ponta, preview/reenvio/liberdade
total funcionando em API e UI, sem achados bloqueantes.
