# T-6: A clínica marca como pago

**Status:** pendente — espera o Bruno decidir o item 1
**Depende de:** T-3 (feita)

## Objetivo

Que dinheiro que entrou fora do sistema possa ser registrado dentro dele.

## Contexto

> O Bruno, 29/09/2026: *"quando um paciente que conhecemos liga na clinic e
> quer agendar uma consulta, e a clini agenda uma consulta e ele paga com
> transferência na conta, a clini coloca como pago e libera a consulta, tá?
> Essas variações são importantes existirem, sempre com a clinic no comando e
> liberdade, sem limitações."*

## O que já existe, e o que falta

**Liberar já dá:** uma consulta `PENDING` tem o botão *Confirm*, que a põe em
`CONFIRMED`. Nesse sentido a clínica já manda.

**Registrar o pagamento não dá.** Confirmar o status não cria `Payment` nenhum,
então:

- a consulta fica confirmada **sem nada recebido nos livros**;
- a fatura, o relatório e qualquer soma de faturamento não enxergam esse
  dinheiro;
- daqui a três meses ninguém sabe se aquela consulta foi paga, cortesia, ou
  esquecida.

Confirmar e receber são duas coisas, e hoje só uma delas tem botão.

## O buraco no modelo

`Payment` **não tem campo de método**, e o enum `PaymentMethod` (que vive na
consulta, não no pagamento) só conhece `ONLINE` e `IN_PERSON`. Transferência
bancária não tem onde ser escrita.

Dá para criar um `Payment` com `status: SUCCEEDED` e sem os identificadores da
Stripe — a ausência deles já distingue "não veio do cartão". Mas isso guarda
**que** entrou, não **como**, e numa conciliação bancária é o "como" que
importa.

## A pergunta para o Bruno

1. **O "como" precisa ficar registrado?**
   - **(a)** Sim: `Payment` ganha `method` (`STRIPE`, `TRANSFER`, `CASH`,
     `CARD_MACHINE`, `OTHER`) e um campo de observação livre. É migração de
     schema, e é o que serve para conciliar com o extrato.
   - **(b)** Não por enquanto: basta um `Payment` marcado como recebido, com
     quem marcou e quando. Sem migração.

A **(a)** é a que eu faria — o dado que não se guarda hoje é o que falta no dia
em que alguém confere o extrato.

## Passos (depois da resposta)

1. Botão *"Marcar como pago"* na linha da consulta, para `PENDING` com preço.
2. Cria o `Payment` com o valor da consulta e **confirma** a consulta no mesmo
   ato — é uma decisão só, e dois botões em sequência viram um esquecido.
3. Guarda **quem** marcou e **quando**. Dinheiro registrado à mão sem autor é
   um convite a discussão.
4. A consulta passa a mostrar "pago por transferência", e não "esperando o
   pagamento".
5. Desfazer: marcar como pago por engano tem de ter volta, com registro.
6. A fatura e o relatório passam a contar esse dinheiro.

## Arquivos afetados
- `prisma/schema.prisma` (se for a opção **a**)
- `app/api/admin/appointments/[id]/payment/route.ts` (nova)
- `app/admin/appointments/page.tsx`
- `__tests__/agenda/a-clinica-marca-como-pago.test.ts`

## Critérios de aceite
- [ ] O Bruno escolheu (a) ou (b).
- [ ] Marcar como pago cria o pagamento **e** libera a consulta.
- [ ] Fica registrado quem marcou e quando.
- [ ] Dá para desfazer.
- [ ] A consulta para de dizer que espera pagamento.
- [ ] Só quem administra marca — receber dinheiro não é ação de terapeuta.
- [ ] A parede da clínica vale aqui como em tudo.
