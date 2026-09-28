# T-1: Modelo do cupom, validação e resolução num só lugar

**Status:** implementada · QA em andamento
**Depende de:** nenhuma

## Objetivo

O cupom existe no banco, e **uma** função responde se ele vale e quanto desconta.

## Contexto

Dez rotas criam Checkout. A decisão 2 do plano: o desconto resolve junto de
`servicePricesForPatient` (082), e quem cobra usa o valor final que sai dali. Nenhuma rota
reimplementa a regra.

## Passos (feitos)

1. `prisma/schema.prisma` — aditivo:
   - `Coupon`: `code` (maiúsculas, `@@unique([clinicId, code])`), `description`,
     `discountPercent`/`discountAmount` (um dos dois), `currency`, `appliesTo` (lista de
     `CouponScope`), `patientId?` (mira), `startsAt?`, `endsAt?`, `maxRedemptions?`,
     `maxPerPatient` (default 1), `isActive`, `createdById`.
   - `CouponRedemption`: `couponId`, `patientId`, `scope`, `originalAmount`, `discountAmount`,
     `finalAmount`, `stripeSessionId?`, `@@index([couponId, patientId])`.
   - `enum CouponScope { CONSULTATION TREATMENT_SESSION PACKAGE MEMBERSHIP }` — **sem exame de
     laboratório** (decisão 5 do plano). Não existir no enum é a garantia mais forte que há: nem
     um cupom mal configurado alcança um exame.
2. Aplicar em produção **e** local com `prisma db execute` (o Postgres local é compartilhado
   entre worktrees — nada de `db push`).
3. `lib/coupon.ts`:
   - `normalizeCode(raw)` — trim + maiúsculas.
   - `resolveCoupon({ clinicId, patientId, code, scope })` → o cupom ou o motivo da recusa
     (`not_found` | `inactive` | `expired` | `not_started` | `wrong_scope` | `not_for_you` |
     `limit_reached` | `already_used`), cada um com frase EN + PT.
   - `applyCoupon({ clinicId, patientId, code, scope, amount })` →
     `{ original, discount, final, couponId }` ou a recusa.
4. `prisma migrate diff` contra o `main`: zero DROPs, colado no relatório de QA.

## Arquivos afetados

- `prisma/schema.prisma`
- `lib/coupon.ts` (novo)
- `lib/service-price.ts` (só se a composição pedir)
- `__tests__/coupon/resolve.test.ts`, `__tests__/coupon/apply.test.ts` (novos)

## Critérios de aceite

- [ ] Cada motivo de recusa tem o seu próprio teste e a sua própria frase (a F2 da 082 foi
      justamente uma recusa dizendo a coisa errada)
- [ ] Caixa não importa: `verao10` acha `VERAO10`
- [ ] Cupom de outra clínica responde como inexistente (tenant pelo actor, nunca por header)
- [ ] Cupom mirado num paciente recusa para os outros com `not_for_you`
- [ ] `maxPerPatient` e `maxRedemptions` contados sobre `CouponRedemption`
- [ ] 100% de desconto devolve `final = 0` e é válido
- [ ] Não há como um cupom alcançar exame — o alcance não existe no enum
- [ ] `prisma migrate diff` contra o `main`: zero DROPs
