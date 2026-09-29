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

- [x] Cobrança **com destino**: nasce na BPR, `application_fee_amount` fica, o
      resto é transferido. *"A BPR cobra, recebe e repassa."*
- [x] Pagou ⇒ consulta confirmada **e** vínculo criado; o reenvio do webhook
      não duplica nenhum dos dois, e ainda assim garante o vínculo.
- [x] Sem Connect pronto, o profissional **não aparece** para marcar.
- [x] Reembolso desfaz os três: `refund_application_fee` e `reverse_transfer`.
- [x] O percentual é por profissional, definido **na tela** — vazio volta ao
      padrão da plataforma, que é diferente de zero.
- [x] A conta arredonda para baixo: o centavo perdido é da BPR, não dele.
- [ ] **Falta medir contra o Stripe de verdade**, em test mode — e depois em
      produção, que hoje não tem chave nenhuma.
