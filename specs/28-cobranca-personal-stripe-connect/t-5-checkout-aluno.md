# T-5: Checkout do aluno

**Status:** pendente
**Depende de:** T-3

## Objetivo
O aluno paga o plano do personal pelo portal — Checkout Session hospedada **na conta conectada** do personal (one-time ou subscription), com taxa de plataforma opcional.

## Contexto
Direct charge: `stripe.checkout.sessions.create({ mode, line_items:[{price: plan.stripePriceId, quantity:1}], customer_email, success_url, cancel_url, ...(fee ? { payment_intent_data:{ application_fee_amount } } | { subscription_data:{ application_fee_percent } } : {}) }, { stripeAccount })`. mode = `subscription` se recorrente, senão `payment`.

## Passos
1. `app/api/billing/checkout/route.ts` (POST) — aluno autenticado; body `{ billingPlanId }`; valida que o plano é do tenant do aluno e ACTIVE; **a conta conectada é resolvida do tenant do PLANO no servidor, nunca de input (G11)**.
   - **G6 (um-ativo)**: se recorrente e já existe `BillingSubscription` ACTIVE do aluno → recusa (409, "cancele a assinatura atual antes"); one-time avulso é permitido.
   - **G3 (customer)**: reusar `StudentStripeCustomer(studentId, acctId)` se existir (passa `customer`); senão o webhook grava o customer criado.
   - **G5 (INCOMPLETE)**: **upsert** de 1 `BillingSubscription` INCOMPLETE por (studentId, billingPlanId) com o `stripeCheckoutSessionId` — não cria linha nova a cada tentativa.
   - cria a session na conta conectada via `stripeFor`; retorna `checkoutUrl`.
2. Fee: aplicar `application_fee_amount` (payment) / `application_fee_percent` (subscription) só se Suposição 2 definir > 0 (v1 = 0 → sem fee).
3. UI no portal do aluno: seção/card "Payments" mostrando o(s) plano(s) que o personal atribuiu + botão "Pay"/"Subscribe" → `window.location = checkoutUrl`. Banners success/cancel via query param.
4. Guarda: só aluno de tenant personal onboardado; senão nada a pagar.

## Arquivos afetados
- `app/api/billing/checkout/route.ts` (novo)
- portal do aluno (card de pagamento; a definir onde — `/dashboard` ou seção nova)

## Critérios de aceite (test mode)
- [ ] POST cria a session NA conta conectada do personal (não na BPR); retorna checkoutUrl.
- [ ] Pagar com cartão de teste → volta com success; `BillingSubscription` some do estado INCOMPLETE (vira PAID/ACTIVE via webhook T-6).
- [ ] Aluno não paga plano de outro tenant/aluno (404); plano arquivado → recusa.
