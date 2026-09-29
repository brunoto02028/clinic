# T-3: Primeira consulta e retorno, ditos com clareza

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

O paciente sabe o que está marcando e por que está pagando aquilo — ou por que
não está pagando nada.

## Contexto

`bookingOptionsFor` já distingue três casos: `FIRST_CONSULTATION`,
`PACKAGE_SESSION` e `EXTRA_SESSION`. A tela reduz os três a um cartão cinza com
um preço — *"Extra session, GBP 100.00 added to your invoice"*.

Isso não diz a uma pessoa o que ela está comprando. Primeira consulta é a porta
de entrada, e é por isso que se paga antes. Retorno é continuidade. Sessão de
pacote não custa nada, e isso é uma boa notícia que a tela guarda para si.

## Passos

1. Cada caso ganha título e uma frase — o que é, e o que acontece com o dinheiro.
2. `PACKAGE_SESSION` diz **quantas sobram**, que é a informação que a pessoa quer.
3. `FIRST_CONSULTATION` diz que o horário **só fica reservado depois de pago** —
   hoje isso é uma surpresa na hora do checkout.
4. Bloqueio (`screening_required`, `price_not_set`) explica o que fazer, e leva
   lá. Hoje `price_not_set` é um beco.
5. As duas línguas, inglês primeiro.

## Arquivos afetados
- `mobile/app/(app)/(clinica)/book-appointment.tsx`
- `mobile/src/lib/pagamento-da-consulta.ts`
- `__tests__/agenda/primeira-vez-e-retorno.test.ts`

## Critérios de aceite
- [ ] Os três casos têm título próprio e frase própria.
- [ ] Pacote mostra quantas sessões sobram.
- [ ] Primeira consulta avisa que o horário depende do pagamento.
- [ ] Cada bloqueio tem saída, e o botão leva lá.
- [ ] Inglês e português, revisados juntos.
