# T-6: O paciente paga, a BPR repassa

**Status:** pendente
**Depende de:** T-5 · **bloqueada por Stripe em produção**

## Objetivo

> *"A BPR cobra do paciente, recebe e repassa o percentual aos profissionais."*

E o pagamento cria o vínculo (T-3) e confirma a consulta, como na 101 T-3.

## Contexto

`lib/connect.ts` já cria conta Connect Express por inquilino
(`Clinic.stripeAccountId`) e `lib/billing.ts` já tem `applicationFeeCents` —
construídos para o personal na atividade 28 e **nunca ligados**.

A 101 T-3 deixou o ciclo pronto: a consulta nasce `PENDING`, o checkout nasce
sob demanda, e o webhook confirma. Aqui muda **uma coisa**: a cobrança passa a
ter destino e taxa.

**Bloqueio medido em 28/09:** produção não tem nenhuma variável `STRIPE`.
Sem conta live e sem webhook secret isto não roda fora do ambiente de teste.

## Passos

1. `Clinic` ganha o percentual da plataforma; a conta Connect já tem campo.
2. O checkout da consulta com profissional externo usa `transfer_data` +
   `application_fee_amount`.
3. O webhook, além de confirmar a consulta, **cria o vínculo de cuidado**.
4. Profissional sem conta Connect pronta **não é oferecido** ao paciente — em
   vez de aceitar dinheiro que não tem para onde ir.
5. Reembolso devolve a taxa junto, senão a BPR fica com a parte de uma consulta
   que não aconteceu.

## Critérios de aceite

- [ ] O paciente paga uma vez, e o profissional recebe o líquido.
- [ ] Pagou ⇒ consulta confirmada **e** vínculo criado, na mesma transação
      lógica; o reenvio do webhook não duplica nenhum dos dois.
- [ ] Sem Connect pronto, o profissional não aparece para marcar.
- [ ] Reembolso desfaz os três: cobrança, taxa e consulta.
- [ ] Medido em test mode de ponta a ponta antes de qualquer conta live.
