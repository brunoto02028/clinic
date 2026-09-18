# QA — Atividade 41: Invoice recorrente de pacote mensal

## T-1: Schema

- **API** — Confirmar `lastInvoicedAt` gravável/legível num `PatientSubscription` de teste.

## T-2: buildInvoiceForSubscription

- **API** — Gerar invoice a partir de uma assinatura de teste (plano £X/mês). Esperado:
  1 item de linha com nome do plano + mês/ano, valor = `plan.price`, dados da clínica
  (logo/cores/banco) idênticos aos outros invoices (reaproveita `getInvoiceBusinessInfo`).

## T-3: Rota de cron

- **API** — `POST /api/cron/membership-invoices?key=ERRADO` → 401.
- **API** — `POST` com key certa, assinatura com `lastInvoicedAt: null` → gera invoice
  pendente, `lastInvoicedAt` atualizado pra agora.
- **API** — Rodar de novo no mesmo dia (mesma assinatura, `lastInvoicedAt` recém
  atualizado) → NÃO gera duplicado.
- **API** — Assinatura com `stripeSubscriptionId` preenchido → ignorada (Stripe já
  cobra).
- **API** — Assinatura `status != ACTIVE` (cancelada/pausada) → ignorada.
- **API** — Plano `isFree: true` → ignorado.

## T-4: Disparo externo

- Confirmar com o usuário que o mecanismo de cron já usado pelas outras 8 rotas
  (`app/api/cron/*`) também dispara essa rota nova, na cadência certa (diária, pra
  cobrir qualquer dia do mês em que uma assinatura vença).
