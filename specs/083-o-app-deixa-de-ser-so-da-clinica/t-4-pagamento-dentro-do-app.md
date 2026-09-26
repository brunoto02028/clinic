# T-4: Pagamento dentro do app

**Status:** implementada · revisada · QA pendente
**Depende de:** nenhuma

## Objetivo

Ninguém sai do app no meio de um pagamento.

## Contexto

Decisão 6 do plano. Três checkouts do Stripe e um OAuth de fabricante de aparelho abriam com
`Linking.openURL` — que entrega a pessoa ao Safari e acaba. E o checkout da consulta devolvia para
uma **página do site**: a pessoa pagava e ficava no navegador, sem caminho de volta.

## Passos (feitos)

1. `mobile/src/lib/checkout.ts` — `openCheckout(url)` com
   `WebBrowser.openAuthSessionAsync(url, "bprclinic://")`, devolvendo
   `"paid" | "cancelled" | "dismissed"`. `dismissed` é fechar a folha: dizer "você cancelou"
   quando não se sabe é inventar, então quem chama relê o estado.
2. Trocado nas quatro telas: `book-appointment.tsx`, `plans.tsx`, `(ba)/membership.tsx`,
   `wearables.tsx`.
3. `app/api/patient/appointments/[id]/checkout/route.ts` — com `x-platform: mobile`, o retorno é
   `bprclinic://appointments?status=success|cancelled` em vez da página do site.
   `mobile/src/api/booking.ts` passou a mandar o cabeçalho.
4. Texto: a tela de assinatura listava os **módulos do app** sob "incluídos" — a moldura exata da
   regra 3.1.1 da App Store. Reescrito como cuidado. O `<Text>Upgrade</Text>` acima dos planos
   pagos — a palavra que um revisor procura — virou "Outros planos da clínica".

## Arquivos afetados

- `mobile/src/lib/checkout.ts` (novo)
- `mobile/app/(app)/(clinica)/book-appointment.tsx`, `plans.tsx`,
  `mobile/app/(app)/(ba)/membership.tsx`, `mobile/app/(app)/(clinica)/wearables.tsx`
- `app/api/patient/appointments/[id]/checkout/route.ts`, `mobile/src/api/booking.ts`
- `__tests__/labs/in-app-payment.test.ts`

## Critérios de aceite

- [x] Nenhuma tela de pagamento usa `Linking.openURL` no que vem do Stripe ou do OAuth
- [x] A folha fecha sozinha no retorno `bprclinic://`
- [x] `dismissed` ≠ `cancelled`
- [x] O checkout da consulta volta por deep link quando quem pede é o app
- [x] Nenhum texto lista módulos do app como benefício pago (3.1.1)
- [ ] **QA:** um pagamento de teste ponta a ponta no aparelho, sem sair do app
