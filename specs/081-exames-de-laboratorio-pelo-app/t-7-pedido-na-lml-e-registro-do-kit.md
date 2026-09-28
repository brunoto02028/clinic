# T-7: Pedido na LML e registro do kit pelo paciente

**Status:** pendente
**Depende de:** T-6

## Objetivo
Pedido pago vira pedido na LML, o kit é despachado, e o paciente associa o kit a si mesmo quando
ele chega.

## Contexto
A LML separa **Order** (o kit físico) de **Test Registration** (o kit ligado a uma pessoa). O
registro pode nascer sem paciente (`awaiting_patient`) e receber o paciente depois, por PATCH com
`patient_id` e `mobile_phone_number`.

`foreign_id` é nosso: serve de idempotência e, na sandbox, os valores mágicos
(`test:abnormal_high:<ref>`) forçam o cenário de resultado que a gente quiser medir.

## Passos
1. Ao confirmar o pagamento: criar o Patient na LML (se ainda não existir para este usuário,
   guardando o id deles) e criar a Order com o endereço de entrega.
2. Guardar `lmlOrderRef`. **Idempotente pelo nosso `foreignId`**: um reenvio do webhook do Stripe
   não pode gerar dois pedidos de verdade — isso custa dinheiro nosso.
3. Criar a Test Registration e guardar `lmlRegistrationId` e `status`.
4. Falha na chamada à LML **não** derruba o pagamento: o pedido fica `CONFIRMED` com evento de erro
   e entra numa fila de reprocessamento. O paciente pagou; o problema é nosso, não dele.
5. Rota de registro do kit: o paciente confirma o código do kit e o telefone; PATCH na LML associa
   a pessoa. O estado vai de `awaiting_patient` para `pending`.
6. TRF e etiqueta da amostra disponíveis para download quando existirem.

## Arquivos afetados
- `lib/lml/orders.ts` (novo)
- `lib/lml/registrations.ts` (novo)
- `app/api/mobile/labs/orders/[id]/register/route.ts` (novo)
- `app/api/webhooks/stripe/route.ts`

## Critérios de aceite
- [ ] Webhook do Stripe entregue duas vezes gera **um** pedido na LML
- [ ] LML fora do ar: o pedido fica confirmado, com evento de erro, e reprocessa depois
- [ ] Registrar kit de pedido de outro paciente → 404
- [ ] Depois do registro, o estado reflete o que a LML devolveu, sem tradução inventada
- [ ] Na sandbox, um `foreignId` mágico produz o cenário pedido
