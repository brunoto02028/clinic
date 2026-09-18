# T-4: Aviso de despacho ao cliente

**Status:** em andamento — implementada, testes passando, aguardando deploy
**Depende de:** nenhuma

## Defeito encontrado ao implementar

`app/api/webhooks/stripe/route.ts:122` notificava só `if (order.patient?.id)`.
Um comprador visitante pagava e **não recebia absolutamente nada** — nem
confirmação, nem aviso de despacho. Corrigido: quando não há conta, o e-mail
vai para o endereço gravado no próprio pedido.

## Objetivo

Que quem comprou saiba que o livro saiu e possa acompanhar — sem isso, a
pergunta "cadê meu livro?" vira e-mail para você.

## Contexto

A tela de pedidos já permite mudar o status e gravar `trackingNumber` e
`trackingUrl`, e monta o link do Royal Mail quando a URL fica vazia. O que não
existe é o cliente ser avisado: ele compra e não recebe mais nada até o livro
chegar.

O Bruno citou Royal Mail, Evri "ou outra" — a transportadora é escolha dele no
despacho, não do cliente na compra. O que falta é o link de rastreio se ajustar
a essa escolha em vez de assumir Royal Mail sempre.

## Passos

1. Campo de transportadora no pedido, com as que ele usa e uma opção livre.
   O link de rastreio passa a ser montado a partir dela.
2. Ao mudar o status para `SHIPPED`, enviar e-mail ao comprador com o número e
   o link — usando o template e o `sendEmail` que já existem.
3. E-mail de confirmação na compra, se ainda não houver: o comprador precisa
   de um comprovante imediato.
4. Falha de e-mail não pode impedir a marcação de despacho — o pedido saiu de
   qualquer jeito; o aviso é registrado como falho e visível.

## Arquivos afetados

- `prisma/schema.prisma` (campo de transportadora)
- `app/admin/marketplace/orders/page.tsx`
- rota que atualiza o pedido (a localizar)
- `lib/email-templates.ts`

## Verificação

`__tests__/shipping/dispatch-notice.test.ts` — **13 testes, todos passando**.
O `sendEmail` é substituído por um espião, então nada é realmente enviado e o
conteúdo do e-mail pode ser lido e conferido. Não disparei e-mail de teste para
endereço inventado: bounce em domínio falso queima a reputação do remetente.

## Critérios de aceite

- [x] Marcar como enviado dispara e-mail com rastreio
- [x] O link corresponde à transportadora escolhida (Royal Mail ≠ Evri ≠ DPD)
- [x] Comprador recebe confirmação ao comprar, **mesmo sem conta**
- [x] Pedido sem rastreio ainda pode ser marcado como enviado, e o e-mail sai
      sem link
- [x] Aviso só na transição para "enviado" — resalvar um pedido já despachado
      não reenvia
- [ ] Falha de e-mail não bloqueia o despacho — a gravação acontece antes do
      envio e a falha é carimbada em `shippingNotifyError`, mas isso só será
      confirmado em execução no QA de produção
