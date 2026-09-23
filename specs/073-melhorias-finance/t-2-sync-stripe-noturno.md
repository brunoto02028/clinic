# T-2: Sync do Stripe automático, via cron noturno

**Status:** concluído
**Depende de:** nenhuma (T-1 e T-2 se cruzam só no dedupe por
`stripePaymentIntentId`, não são bloqueantes entre si)

## Objetivo

Dashboard reflete receita do Stripe sem depender de alguém lembrar de
clicar "Sync Stripe".

## Contexto

Lógica de sync hoje mora inteira dentro do `POST` de
`app/api/admin/finance/stripe/route.ts`, atrás de `getSuperadminActor`
(sessão, não `?key=`). Precisa ser extraída pra ser chamável também por
cron.

## Passos

1. `lib/finance-stripe-sync.ts` (novo) — move a lógica de
   `app/api/admin/finance/stripe/route.ts`'s `POST` (linhas 11-172:
   `charges.list`, `paymentIntents.list`, dedupe por
   `stripeChargeId`/`stripePaymentIntentId`, inferência de categoria,
   match de paciente por e-mail) pra uma função exportada, ex.
   `syncStripeFinancialEntries(clinicId?: string)`, retornando
   `{imported, skipped}` (mesmo contrato que o botão já espera).
2. `app/api/admin/finance/stripe/route.ts` — `POST` passa a só chamar
   essa função (auth por sessão inalterada).
3. `app/api/cron/finance-stripe-sync/route.ts` (novo) — mesmo padrão dos
   outros 12 crons (`?key=` contra `CRON_SECRET || NEXTAUTH_SECRET`),
   chama a mesma função.
4. Nenhuma mudança na paginação (limite de 100 por chamada é aceito,
   fora de escopo).

## Arquivos afetados

- `lib/finance-stripe-sync.ts` (novo)
- `app/api/admin/finance/stripe/route.ts`
- `app/api/cron/finance-stripe-sync/route.ts` (novo)

## Critérios de aceite

- [ ] Botão manual "Sync Stripe" continua funcionando exatamente igual
      (mesma resposta, mesmo comportamento).
- [ ] `POST /api/cron/finance-stripe-sync?key=ERRADO` → 401.
- [ ] `POST /api/cron/finance-stripe-sync?key=CERTO` roda o mesmo sync,
      sem exigir sessão.
- [ ] Rodar duas vezes seguidas não duplica nada (dedupe já existente
      preservado).
