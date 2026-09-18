# QA Spec — Atividade 28 (Cobrança via Stripe Connect)

**Todo o QA em Stripe TEST mode**, com conta(s) conectada(s) de teste. Nunca chaves live. Tenant PERSONAL_TRAINER (onboardado e não-onboardado) + tenant CLINIC (regressão). Fixtures criadas e limpas.

## T-1 Connect onboarding
- **API** POST /api/admin/connect/onboard (personal) → cria Express account (test), grava `stripeAccountId`, retorna URL; 2ª chamada não duplica.
- **API** GET /api/admin/connect/status → antes de onboardar `onboarded:false`; após completar onboarding de teste → `onboarded:true` (flag gravada).
- **Gate** tenant CLINIC / não-personal → negado.
- **UI** card "Connect payouts" mostra estado conectado/pendente.

## T-2 Modelo
- `prisma validate` ok; tabelas `BillingPlan`/`BillingSubscription`; client expõe. Models de pagamento clínicos inalterados.

## T-3 API planos
- **API** POST cria product+price NA conta conectada (verificar via `stripe.products.list({}, {stripeAccount})` que existe lá e NÃO na BPR).
- **API** sem onboarding → 409; CLINIC → 404; nome vazio/amount ≤ 0/intervalo inválido → 400.
- **API** GET lista do tenant; PATCH muda preço (novo price na conta conectada, antigo desativado); archive.

## T-4 UI admin
- **UI** não-onboardado → CTA conectar; onboardado → lista + form criar plano (one-time/weekly/monthly/yearly) + status por aluno.
- **UI regressão** CLINIC não vê billing.

## T-5 Checkout do aluno
- **API** POST /api/billing/checkout (aluno) → session criada NA conta conectada; retorna checkoutUrl; cria `BillingSubscription` INCOMPLETE.
- **UI** aluno vê o plano e paga (cartão de teste 4242…) → volta success.
- **Scope** aluno não paga plano de outro tenant/aluno (404); plano ARCHIVED → recusa.
- **G6 um-ativo** com uma assinatura recorrente ACTIVE, novo checkout recorrente → 409; one-time avulso → permitido.
- **G5 INCOMPLETE** 2 checkouts do mesmo aluno/plano sem pagar → **1** linha INCOMPLETE (upsert), não duas; `checkout.session.expired` marca/limpa.
- **G3 customer** 2ª cobrança do mesmo aluno na mesma conta reusa o mesmo `customerId` (não duplica customer).
- **Fee** v1: sem application fee (Suposição 2 = 0%). Se ligado, conferir o fee na session.

## T-6 Webhooks Connect
- **Webhook** após pagar → `checkout.session.completed` (conta conectada) atualiza `BillingSubscription` para PAID (one-time) / ACTIVE (subscription) com ids Stripe.
- **Webhook** `customer.subscription.updated`→ status mapeado; `deleted`→ CANCELLED.
- **Webhook** `account.updated` → `stripeOnboarded` atualizado.
- **Refund/cancel** admin cancela assinatura → CANCELLED + cancela na Stripe (conta conectada); estorno com `stripeAccount`.
- **G2 idempotência** reenviar o MESMO `event.id` → 200 no-op, estado não muda/regride (via `ProcessedStripeEvent`).
- **G2 ACK** evento com `account` não mapeado / tipo irrelevante → **200** (não 4xx); assinatura inválida → 400.
- **G4 estado** conta com `payouts_enabled:false` ou `requirements.currently_due` → status reflete "action needed"/payouts pendentes.
- **Isolamento** evento com `account` de tenant X casa o tenant X; webhook BPR existente intacto.

## T-7 Gating + regressão
- CLINIC: nenhuma superfície de billing. PERSONAL não-onboardado: só CTA. PERSONAL onboardado: fluxo completo.
- Stripe BPR (memberships/packages/appointments/marketplace) sem regressão; nenhum charge do personal caiu na conta BPR.
