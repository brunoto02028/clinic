# T-6: A clínica marca como pago

**Status:** 🟢 concluída (29/09) — aguardando QA
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

## A resposta do Bruno, 29/09/2026

> *"O pagamento precisa ser via transferência, o via app (que vai pelo Stripe);
> não teremos maquininha presencialmente. Dinheiro pessoalmente também
> aceitaremos."*

Três canais, e **só três**: `STRIPE`, `TRANSFER`, `CASH`. Maquininha ficou de
fora porque a clínica não tem uma, e um valor que ninguém escolhe só confunde
quem lê o relatório depois.

Fica também um `note` livre — não para inventar uma quarta categoria, mas para o
caso fora da curva não exigir migração de schema. É o "sem limitações" sem
inventar taxonomia.

`STRIPE` é o padrão porque **é o que todo pagamento existente é**: os outros dois
não tinham como ser registrados até agora.

## O que foi feito

- `Payment` ganhou `channel`, `note`, `recordedById` e `recordedAt`.
- `POST /api/admin/appointments/[id]/payment` **registra e libera no mesmo
  ato** — dois botões em sequência viram um esquecido, e o esquecido aqui é o
  que põe o dinheiro nos livros.
- `upsert`, e não `create`: uma consulta pode ter um `Payment` pendente da
  Stripe que nunca completou, e dois registros para a mesma consulta seriam
  pior que nenhum.
- O valor é **o da consulta**, nunca o que o cliente mandar no corpo.
- Preço zero recusa: registrar £0,00 como recebido põe linha falsa no
  faturamento.
- `DELETE` desfaz — o pagamento vira `FAILED` em vez de sumir, porque apagar a
  linha apagaria também quem a criou. Pagamento de cartão **não** se desfaz por
  aqui: isso é reembolso, tem dinheiro do outro lado.
- Só ADMIN e SUPERADMIN. Terapeuta marca presença, conclui e cancela; dizer que
  um valor entrou na conta é outra coisa.

## Passos

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
- [x] O Bruno escolheu: os três canais, sem maquininha.
- [x] Marcar como pago cria o pagamento **e** libera a consulta.
- [x] Fica registrado quem marcou e quando.
- [x] Dá para desfazer — e cartão não se desfaz por aqui.
- [x] A consulta para de dizer que espera pagamento (vira `CONFIRMED`).
- [x] Só quem administra marca.
- [x] A parede da clínica vale aqui como em tudo, com 404 para o que não é seu.
- [ ] QA: marcar, conferir a fatura, e desfazer.
