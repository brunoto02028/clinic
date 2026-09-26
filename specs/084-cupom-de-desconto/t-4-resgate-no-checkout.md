# T-4: Resgate no checkout — dez portas, uma regra, idempotente

**Status:** implementada · QA pendente
**Depende de:** T-1, T-3

## Objetivo

O desconto que a tela prometeu é o que o Stripe cobra, e o resgate é gravado uma vez.

## Contexto

Decisão 2 do plano: dez rotas criam Checkout. Esta tarefa é a que fecha o buraco entre "a tela
mostrou £80" e "o cartão foi debitado em £80".

## Passos (feitos)

1. Levantar as dez rotas (`grep stripe.checkout.sessions.create`) e marcar quais aceitam cupom
   nesta atividade: consulta, sessão, pacote e adesão a plano. Todas as outras — inclusive **o
   exame de laboratório** (decisão 5) — ignoram o `code` e cobram cheio. Escrito, não esquecido.
2. Cada rota que aceita: revalida com `applyCoupon` **no servidor** (a prévia da T-3 não vale como
   autorização) e cobra o `final`.
3. Gravar `CouponRedemption` antes de criar a sessão, com `find-then-write`; se o Checkout falhar,
   apagar o resgate. Um resgate sem cobrança consome limite de graça.
4. Guardar `stripeSessionId` no resgate, e no webhook de `checkout.session.completed` marcar o
   resgate como confirmado. Sessão expirada → o resgate volta a não contar.
5. ~~Preencher `Order.discountCode` e `discountAmount`~~ — **não se aplica.** Nenhuma das quatro
   rotas do escopo cria `Order`: aquela tabela é da loja e do marketplace, que estão fora. Deixar
   a coluna intocada é mais honesto que preenchê-la de um lugar que não a lê.
6. Exame de laboratório: nada a fazer além de **não** chamar `applyCoupon` — e um teste que
   reprove a chegada de um cupom ali, para o dia em que alguém copiar uma dessas rotas.

## Arquivos afetados

- `app/api/patient/appointments/[id]/checkout/route.ts`
- `app/api/patient/packages/checkout/route.ts`
- `app/api/patient/membership/subscribe/route.ts`
- o webhook do Stripe
- `__tests__/coupon/redemption.test.ts`, `__tests__/coupon/checkout-amount.test.ts` (novos)

## Critérios de aceite

- [ ] O valor enviado ao Stripe é o `final` do `applyCoupon`, recalculado no servidor
- [ ] Dois toques no botão geram **um** resgate
- [ ] Checkout que falha não deixa resgate para trás
- [ ] Sessão expirada libera o limite de novo
- [ ] `maxRedemptions` esgotado durante o pagamento de outra pessoa recusa com frase, não com 500
- [ ] Exame com `code` no corpo: cobra cheio, e o teste reprova quem ligar cupom ali
- [x] ~~`Order.discountCode`~~ — não se aplica (passo 5)
- [ ] Rota fora do escopo com `code` no corpo: ignora e cobra cheio (nunca desconta por acidente)
