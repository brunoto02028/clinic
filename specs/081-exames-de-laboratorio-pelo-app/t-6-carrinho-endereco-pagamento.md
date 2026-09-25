# T-6: Carrinho, endereço de entrega e pagamento

**Status:** pendente
**Depende de:** T-1, T-5

## Objetivo
O paciente escolhe um exame, confirma para onde o kit vai, paga, e o pedido nasce confirmado.

## Contexto
Mesmo padrão da 080: **o servidor decide o preço**. O cliente manda `productId` e quantidade, mais
nada. Preço vindo do corpo é ignorado — e tem teste provando que é ignorado, porque na 080 o
`price` era ignorado corretamente e o `treatmentType` não era.

O kit vai pelo correio, então endereço é obrigatório e é dado novo: o `User` tem `address`, mas não
tem CEP separado, e a LML pede `postcode`.

## Passos
1. Reescrever `POST /api/mobile/labs/orders` (105 linhas hoje): `clinicId` do actor, `unitPrice` e
   `unitCost` copiados do produto no instante da venda, total somado no servidor.
2. Endereço de entrega no pedido (`shippingName`, `shippingAddress`, `shippingPostcode`, já no
   schema), validado: sem CEP não há pedido.
3. Checkout Stripe no formato da 080 — `labOrderId` **e** `patientId` no metadata, para o webhook
   conferir dono sem depender de campo opcional (foi a N2 da 080: a guarda era condicional e só um
   dos dois produtores escrevia o paciente).
4. Webhook do Stripe: pedido `BASKET` → `CONFIRMED`, `paidAt`, evento em `LabOrderEvent`.
   Idempotente — evento repetido não faz nada.
5. Pedido `BASKET` não reserva nada e expira; só `CONFIRMED` vira pedido na LML (T-4).
6. Preço zero, negativo ou produto inativo → 400 antes de tocar no Stripe.

## Arquivos afetados
- `app/api/mobile/labs/orders/route.ts`
- `app/api/labs/checkout/route.ts` (novo)
- `app/api/webhooks/stripe/route.ts`
- `lib/lab-order.ts` (novo)

## Critérios de aceite
- [ ] `{"price": 0.30}` no corpo é ignorado; o gravado é o `retailPrice` do produto
- [ ] `unitCost` gravado bate com o `costPrice` do produto naquele instante
- [ ] Mudar o preço do produto **depois** não muda o pedido já feito
- [ ] Sem CEP → 400, em EN e PT
- [ ] Webhook repetido não duplica pagamento nem evento
- [ ] Paciente da clínica A não vê nem paga pedido da clínica B → 404
