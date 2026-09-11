# T-6: Webhooks de Connect + refund

**Status:** pendente
**Depende de:** T-5

## Objetivo
Persistir o status de pagamento/assinatura a partir dos eventos das contas conectadas, e permitir estorno/cancelamento na conta do personal.

## Contexto
Webhook de Connect é um endpoint separado (eventos de contas conectadas trazem `event.account`). Assinatura verificada com `STRIPE_CONNECT_WEBHOOK_SECRET`. NÃO mexer no webhook BPR existente (`app/api/webhooks/stripe`).

## Passos
1. `app/api/webhooks/stripe-connect/route.ts`: verify com `STRIPE_CONNECT_WEBHOOK_SECRET`; **400 só para assinatura inválida**.
   - **G2 idempotência**: se `event.id` já está em `ProcessedStripeEvent` → **200 no-op**; senão processa e grava. Casa `event.account` → tenant por `stripeAccountId`; **conta não mapeada / evento irrelevante → log + 200 (ACK)** (nunca 4xx, senão a Stripe reentrega por dias).
   - `account.updated` → atualiza `stripeOnboarded`/`stripePayoutsEnabled`/`stripeRequirementsDue` (G4).
   - `checkout.session.completed` → acha `BillingSubscription` por `stripeCheckoutSessionId`; grava `stripeCustomerId`/`stripeSubscriptionId`; status PAID (one-time) ou ACTIVE (subscription) + `currentPeriodEnd`; grava `StudentStripeCustomer` (G3).
   - `checkout.session.expired` (G5) → marca o INCOMPLETE correspondente como expirado/limpa.
   - `customer.subscription.updated/deleted` → status (active→ACTIVE, past_due/unpaid→PAST_DUE, canceled→CANCELLED) + `cancelAtPeriodEnd`/`cancelledAt`/período.
   - `invoice.paid` / `invoice.payment_failed` → renova / marca PAST_DUE.
2. **G7 Refund/cancelamento** (staff do PRÓPRIO tenant personal — nunca outro tenant; BPR não estorna por padrão): cancelar por padrão **no fim do período** (`cancel_at_period_end:true`), opção imediato; refund **total** via `stripe.refunds.create(..., { stripeAccount })`. Atualiza `BillingSubscription`.

## Arquivos afetados
- `app/api/webhooks/stripe-connect/route.ts` (novo)
- endpoint de cancel/refund do billing (admin)

## Critérios de aceite (test mode)
- [ ] Após pagar, o webhook Connect atualiza `BillingSubscription` (PAID/ACTIVE) com os ids Stripe.
- [ ] Cancelar assinatura no admin reflete CANCELLED e cancela na Stripe (conta conectada).
- [ ] Evento com `account` de outro tenant casa o tenant certo; assinatura inválida → 400.
- [ ] Webhook BPR existente intacto.
