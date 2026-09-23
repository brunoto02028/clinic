# Atividade 073 — Melhorias no Finance (Dashboard, Stripe, recorrência, categorias)

## Objetivo

Corrige o achado mais importante do QA da área Finance (dashboard zerado
mesmo com receita real faturada) e implementa as outras 4 sugestões que
saíram do mesmo levantamento.

Pedido original (Bruno, verbatim): *"vamos corrigir e melhorar tudo"*.

## Levantamento (não repetir — já investigado nesta sessão)

- **`model FinancialEntry`** (`prisma/schema.prisma:5592-5649`) é o livro-caixa
  do Finance. Único vínculo com paciente é `patientId`/`patientName`
  (denormalizado, sem FK real) — nenhum campo aponta pra `PatientInvoice`
  ou `Appointment` hoje.
- **`FinancialEntry` só é criado em 3 lugares**: manual pela UI
  (`app/api/admin/finance/route.ts:161`), sync do Stripe
  (`app/api/admin/finance/stripe/route.ts:86,148`, dentro do `POST`, não
  do `GET` — o `GET` só lê e retorna, nunca grava), e a API externa
  (`app/api/external/finance/route.ts:385`). **Confirmado: nem
  `app/api/admin/invoices/[id]/route.ts` (`markPaid`) nem
  `lib/create-patient-invoice.ts` (`alreadyPaidViaStripe`) tocam
  `FinancialEntry`** — é por isso que o Dashboard fica zerado mesmo com
  fatura paga.
- **`isRecurring`/`recurringDay`** existem no schema e são gravados pela UI
  manual, mas **nada em `app/api/cron/*` ou `lib/` os lê** — confirmado,
  zero automação por trás desses campos hoje.
- **Componente de gráfico já usado no projeto**:
  `components/body-assessment/assessment-progress-chart.tsx`
  (`AssessmentProgressChart`) — `recharts` (`AreaChart`+`Line`), já
  resolve tooltip/legenda/formatação PT-EN. É o único gráfico de série
  temporal do projeto (o Dashboard do Finance hoje usa barra de progresso
  HTML pura, sem `recharts`). Reaproveitável como referência de padrão,
  não literalmente (dataset diferente: mês a mês, não avaliação a
  avaliação).
- **Crons existentes** (`app/api/cron/*`, 13 rotas) seguem todos o mesmo
  padrão: `POST .../route?key=SECRET`, `CRON_SECRET || NEXTAUTH_SECRET`.
  O mais parecido com "gerar registro financeiro recorrente" é
  `membership-invoices` (usa `lastInvoicedAt` pra saber se já gerou este
  período) — mesmo padrão que vamos seguir aqui.
- **Sync do Stripe hoje exige sessão de `SUPERADMIN`**
  (`getSuperadminActor`, não `?key=`) — diferente do padrão dos crons.
  Pra rodar via cron noturno, a lógica de sync precisa ser extraída pra
  uma função compartilhada (`lib/`), chamada tanto pelo botão manual
  (mantém a auth por sessão) quanto por uma rota `app/api/cron/*` nova
  (auth por `?key=`, igual as outras 13).
- Sync do Stripe hoje busca só os 100 mais recentes de `charges` e de
  `paymentIntents`, sem paginação — limitação conhecida, aceitável por
  enquanto (não é escopo desta atividade resolver paginação).

## Decisões de design

- **T-1 (a correção crítica): marcar fatura como paga — manual ou
  automática via Stripe — passa a criar um `FinancialEntry` junto.**
  `PatientInvoice` ganha `financialEntryId String? @unique` pra nunca
  duplicar. Categoria de receita inferida pela origem da fatura:
  `appointmentId` preenchido → `CONSULTATION`; `patientSubscriptionId`
  preenchido → `MEMBERSHIP`; nenhum dos dois (avulsa) → `OTHER_INCOME`.
  Quando a origem é Stripe (`paidMethod: "stripe"`), o `FinancialEntry`
  grava o mesmo `stripePaymentIntentId` do `Payment` original — isso é
  importante: se o sync do Stripe (T-2) rodar depois e enxergar essa
  mesma cobrança, o dedupe que ele já faz por `stripePaymentIntentId`
  evita contar a receita duas vezes.
- **T-2: sync do Stripe passa a rodar sozinho, todo dia, à noite**, sem
  depender do botão manual. Lógica de sync extraída pra
  `lib/finance-stripe-sync.ts` (mesma lógica de hoje, só movida), chamada
  por `app/api/admin/finance/stripe/route.ts` (botão manual, sessão
  `SUPERADMIN`, inalterado pro usuário) e por
  `app/api/cron/finance-stripe-sync/route.ts` (novo, `?key=` como os
  outros 12).
- **T-3: despesa recorrente passa a gerar a entrada do mês sozinha.**
  `FinancialEntry` ganha `lastGeneratedAt DateTime?` (só relevante na
  entrada "modelo", a primeira criada com `isRecurring: true`). Cron novo
  (`app/api/cron/finance-recurring-entries/route.ts`) roda diário,
  encontra entradas `isRecurring: true` cujo `recurringDay` bate com o dia
  de hoje e que ainda não geraram a entrada deste mês (comparando
  `lastGeneratedAt`), cria uma cópia (mesma descrição/categoria/valor,
  `status: PENDING`, `dueDate` de hoje) e atualiza `lastGeneratedAt` na
  entrada modelo. Mesmo padrão de "gera, nunca envia nada pra ninguém" —
  é 100% interno, staff decide quando marcar como paga.
- **T-4: Dashboard ganha um gráfico de série temporal de verdade**, reaproveitando
  o padrão `recharts` já usado em `assessment-progress-chart.tsx` (não o
  componente em si — dataset diferente). Mostra os últimos 12 meses de
  receita x despesa, **sempre os últimos 12 meses, independente do filtro
  de período** (This Month/Last Month/This Year/All Time continuam
  válidos pros números/cards acima, só o gráfico novo é fixo em 12 meses
  — é o recorte que faz sentido pra enxergar tendência). Precisa de um
  agregado novo por mês no `GET /api/admin/finance/route.ts` (hoje só
  agrega por categoria, não por mês).
- **T-5: nota de esclarecimento na aba Categories** — "Deactivate" não é
  apagar de vez (preserva histórico contábil), só alterna
  `isActive: false`. Só texto/tooltip, sem mudança de comportamento.

## Suposições — aprovadas pelo Bruno (23/09/2026, "ok")

1. Categoria de receita por origem (CONSULTATION/MEMBERSHIP/OTHER_INCOME) — confirmado.
2. Seletor opcional de forma de pagamento no "Mark as paid" — confirmado.
3. Gráfico do Dashboard sempre em 12 meses fixos, independente do filtro — confirmado.
4. Despesa recorrente gera como `PENDING` — confirmado.

## Fora de escopo

- Paginação do sync do Stripe (limite de 100 por chamada) — conhecido,
  não é bug introduzido aqui, fica pra outra atividade se virar problema
  real.
- Qualquer notificação automática pro paciente — nenhuma das 3
  automações novas (T-1/T-2/T-3) manda nada pra fora da clínica, é tudo
  staff-facing/interno.
- Hard-delete de categoria — T-5 só esclarece o texto, não muda o
  comportamento de "Deactivate".

## Tarefas

| T-N | Nome | Status |
|-----|------|--------|
| T-1 | Fatura paga gera `FinancialEntry` automaticamente (correção crítica) | concluído |
| T-2 | Sync do Stripe automático, via cron noturno | concluído |
| T-3 | Despesa recorrente gera a entrada do mês sozinha | concluído |
| T-4 | Dashboard com gráfico de série temporal (12 meses) | concluído |
| T-5 | Nota de esclarecimento em Categories ("Deactivate" ≠ apagar) | concluído |

## Aprovação

Aprovado pelo Bruno em 23/09/2026. Pronto pra implementação.
