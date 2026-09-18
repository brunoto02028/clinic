# T-3: Lib + API de planos de cobrança

**Status:** pendente
**Depende de:** T-1, T-2

## Objetivo
CRUD dos planos de cobrança do personal; criar plano cria product+price **na conta conectada** do personal.

## Contexto
Direct charges: `stripe.products.create({...}, { stripeAccount })` e `stripe.prices.create({ unit_amount, currency, recurring? }, { stripeAccount })`. Gate: personal + `charges_enabled`.
**G1/G11 (invariantes):** todo acesso à Stripe no billing passa por `stripeFor(clinicId)` (único ponto, embute `{ stripeAccount }` resolvido do tenant no servidor). PROIBIDO importar `lib/stripe-marketplace.ts` ou o singleton `stripe` nu aqui — senão o produto nasce na conta BPR.

## Passos
1. `lib/billing.ts`: `validateBillingPlan(input): string|null` (nome; `amountCents ≥ 30` piso Stripe e ≤ limite; `currency==="GBP"` travado no v1 — G12; interval válido); `toStripeRecurring(interval)`; `applicationFee(amountCents)` (v1 → 0, aplicado só se > 0).
2. `lib/connect.ts` (add): `stripeFor(clinicId)` → resolve `stripeAccountId` do tenant e devolve um acessor que injeta `{ stripeAccount }`; `assertChargesEnabled(clinicId)` → 409 se `!stripeOnboarded` (charges_enabled).
3. `app/api/admin/billing-plans/route.ts`: GET (lista do tenant, opcional ?studentId nas subs), POST (valida → cria product+price na conta conectada → salva ids). Gate `assertNutritionAccess` + `assertOnboarded`.
4. `app/api/admin/billing-plans/[id]/route.ts`: GET, PATCH (nome/descrição; preço muda → arquiva price e cria novo na conta conectada), DELETE/archive (status ARCHIVED + desativa price na conta conectada).

## Arquivos afetados
- `lib/billing.ts`, `lib/connect.ts` (novos/add)
- `app/api/admin/billing-plans/route.ts` (+ `[id]`)

## Critérios de aceite (test mode)
- [ ] POST cria product+price NA conta conectada (verificável: existe no acct do personal, não na BPR).
- [ ] Sem onboarding → 409; tenant CLINIC → 404; payload inválido → 400.
- [ ] GET lista só planos do tenant; PATCH/archive corretos.
