# T-3: Campo de código no app, com o preço se reescrevendo

**Status:** implementada · QA pendente
**Depende de:** T-1

## Objetivo

O paciente digita o código e **vê** o preço mudar antes de pagar.

## Contexto

Decisão 3 do plano, e a razão de não usar o cupom do Stripe: o app mostrando £100 e o Stripe
cobrando £80 é a falha N4 da 080 de novo. O desconto tem de estar na tela onde o botão de pagar
está.

## Passos (feitos)

1. `app/api/patient/coupons/preview/route.ts` — POST `{ code, scope, targetId? }` → o valor
   original, o desconto, o final e o nome da campanha; ou a recusa com a frase pronta (EN + PT).
   **Não grava resgate** — é prévia. Tenant e paciente pelo actor mobile.

   Mudança em relação ao que estava escrito: **não existe `amount` no corpo**. Aceitar o valor do
   app seria deixar alguém pedir 20% de £10.000 e receber a conta pronta para exibir. A tela diz
   *o que* está comprando (`scope` + `targetId`); quanto custa é resposta do servidor.
2. `mobile/src/api/coupons.ts` + `mobile/src/components/CouponField.tsx`: campo, botão
   "Apply"/"Aplicar", estado aplicado (código, campanha, quanto desceu, remover).
3. Entrar nas telas que cobram:
   - `(clinica)/book-appointment.tsx` (consulta/sessão)
   - `(clinica)/plans.tsx` (adesão a plano e pacote de tratamento)

   A tela do exame do laboratório **não** ganha campo de cupom (decisão 5 do plano).
4. O preço exibido passa a ser o final; o original aparece riscado **só quando há cupom** — e
   nunca como "preço especial" no caso da exceção da 082 (decisão 3 da 082: o paciente não sabe
   que é exceção).
5. Quem não digita nada segue pagando o preço da 082 — o campo é opcional e nunca bloqueia.

## Arquivos afetados

- `app/api/patient/coupons/preview/route.ts` (novo)
- `mobile/src/api/coupons.ts`, `mobile/src/components/CouponField.tsx` (novos)
- `mobile/app/(app)/(clinica)/book-appointment.tsx`, `.../plans.tsx`
- `__tests__/coupon/preview-route.test.ts`, `__tests__/coupon/app-field.test.ts` (novos)

## Critérios de aceite

- [ ] Código inválido mostra **o motivo**, não "erro"
- [ ] Aplicado: a tela mostra original riscado, desconto e final, com o nome da campanha
- [ ] Remover o cupom devolve o preço cheio na tela
- [ ] A prévia não grava resgate (consultar duas vezes não consome limite)
- [ ] Sem cupom, a tela é idêntica à de hoje
- [ ] Todo texto em EN e PT, inglês primeiro
- [ ] ~~Cupom de 100% troca o botão de pagar por "Confirmar"~~ — **fica para a T-4**: quem
      decide se abre Checkout é o servidor, ao ver o valor final zerado
- [ ] A tela do exame **não** tem campo de cupom
