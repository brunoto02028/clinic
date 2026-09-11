# T-1: Stripe Connect onboarding

**Status:** pendente
**Depende de:** nenhuma

## Objetivo
O personal conecta a própria conta Stripe (Express) e volta onboardado; o sistema grava `Clinic.stripeAccountId`/`stripeOnboarded`.

## Contexto
`Clinic.stripeAccountId`/`stripeOnboarded` já existem no schema (nunca escritos). Connect Express: `stripe.accounts.create({ type:"express", ... })` + `stripe.accountLinks.create({ account, refresh_url, return_url, type:"account_onboarding" })`. Onboarding é hospedado pela Stripe.

## Passos
1. `lib/connect.ts`: `getOrCreateConnectedAccount(clinicId)` → cria Express account se não houver `stripeAccountId`, salva; `createOnboardingLink(acctId)` → account link; `refreshAccountStatus(clinicId)` → `stripe.accounts.retrieve(acctId)` e grava **estado rico (G4)**: `stripeOnboarded = charges_enabled` (gate de cobrar), `stripePayoutsEnabled = payouts_enabled`, `stripeRequirementsDue = requirements.currently_due?.length > 0 || !!requirements.disabled_reason`.
2. `app/api/admin/connect/onboard/route.ts` (POST) → staff do tenant personal; cria conta + retorna URL de onboarding. Gate: `assertNutritionAccess`/personal.
3. `app/api/admin/connect/status/route.ts` (GET) → retorna `{ connected, chargesEnabled, payoutsEnabled, actionNeeded }` (refresha via retrieve).
4. UI: card "Payouts / Get paid" no admin do personal (settings ou getting-started) — botão "Connect Stripe"; estados: não conectado / **action needed** (requirements due) / payouts pendentes / pronto; link "manage".
5. `account.updated` no webhook (T-6) flipa `stripeOnboarded` — mas o status GET já cobre o caminho síncrono.

## Arquivos afetados
- `lib/connect.ts` (novo)
- `app/api/admin/connect/onboard/route.ts`, `.../status/route.ts` (novos)
- UI no admin do personal (a definir: settings/getting-started)

## Critérios de aceite (test mode)
- [ ] POST onboard cria Express account (test), grava `stripeAccountId`, retorna URL.
- [ ] Completar o onboarding de teste → status GET retorna `onboarded:true` e grava a flag.
- [ ] Tenant CLINIC / não-personal → negado.
- [ ] Idempotente: chamar onboard 2x não cria conta duplicada.
