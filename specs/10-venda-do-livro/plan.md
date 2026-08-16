# Atividade 10 — Página de vendas do livro

## Objetivo

Uma página dedicada a vender o **Beyond Pain** em papel, feita para receber
tráfego pago do Google Ads e do Instagram: a pessoa chega do anúncio, compra,
e o Bruno despacha por Royal Mail, Evri ou quem for.

## O que já existe (e muda o tamanho do trabalho)

Quase toda a infraestrutura de venda física está pronta:

| Peça | Situação |
|---|---|
| `Order` com `shippingAddress`, `shippingAmount`, `shippingMethod`, `trackingNumber`, `trackingUrl` | pronto |
| `OrderStatus` até `DELIVERED`, com `REFUNDED` | pronto |
| `/api/shop/checkout` — subtotal + frete por produto + taxa Stripe, cria o pedido e a sessão de pagamento | pronto |
| `Product` com `price`, `shippingCost`, `isDigital`, `imageUrl`, `costPrice` | pronto |
| Tela de pedidos no admin, com edição de status e rastreio | pronto |
| `/beyond-pain` com interruptor de lançamento (`PRE_LAUNCH`, `WAITLIST`, `buyLinkDirect`, `priceDisplay`) | pronto |
| Google Analytics com `trackEvent` | pronto |

O que falta é a **página de venda em si**, o **livro como produto**, e a
**medição de conversão** que o tráfego pago exige.

## Decisões de design

**Página separada, não adaptação da atual.** `/beyond-pain` hoje é captura do
primeiro capítulo grátis — objetivo diferente, público diferente (frio, vindo
de artigo). Quem clica num anúncio de compra chega com intenção de comprar;
misturar "leia grátis" com "compre" numa página só reduz as duas conversões.
A de captura continua, e vira o destino de quem hesita.

**Uma página, um botão.** Tráfego pago se mede por uma ação. Tudo na página
empurra para comprar; o capítulo grátis aparece uma vez, no fim, como saída
para quem não vai comprar hoje.

**Frete é um valor no produto, não uma escolha do cliente.** O `Product` já
tem `shippingCost`. O cliente vê um preço de entrega; o Bruno escolhe a
transportadora na hora de despachar e cola o rastreio. Isso corresponde ao que
ele descreveu e evita construir cotação de frete por peso e destino, que é um
projeto inteiro.

**A conversão precisa ser medida no servidor.** Um pixel disparado no botão
conta cliques, não vendas. O evento de compra sai depois do pagamento
confirmado, senão o Google Ads otimiza para a métrica errada e o dinheiro do
anúncio vai para quem clica e não compra.

## Tarefas

| Tarefa | Nome | Status |
|---|---|---|
| T-1 | O livro como produto vendável | em andamento |
| T-2 | Página de vendas | em andamento |
| T-3 | Medição de conversão para Ads | em andamento |
| T-4 | Aviso de despacho ao cliente | em andamento |

T-1 vem primeiro: sem produto não há o que comprar. T-2 e T-3 andam juntas.
T-4 é independente e pode ficar por último.

## Bloqueio

**O Stripe não está configurado.** `STRIPE_SECRET_KEY` não existe no Coolify —
confirmado. O checkout monta o pedido e falha ao criar a sessão de pagamento.

Dá para construir e testar tudo menos o pagamento real. **Nada vai ao ar para
tráfego pago sem a chave**, porque a página estaria recebendo cliques pagos e
falhando na hora de cobrar.

## Suposições

Cada uma muda o resultado se estiver errada:

1. **Livro físico, entrega no Reino Unido.** Se for vender para fora, o frete
   precisa variar por país, e isso muda a T-1.
2. ~~Preço e frete fixos~~ — **decidido:** frete embutido no preço, £0 no
   checkout, para o valor do anúncio ser o valor cobrado. `freeShippingOver`
   passou a funcionar na loja pública caso você mude de ideia.
3. ~~O comprador não precisa de conta, como a loja já faz~~ — **a suposição
   estava errada.** A loja pública *não* fazia isso: `MarketplaceOrder.patientId`
   era obrigatório e todo checkout de visitante devolvia 500. Corrigido na T-1.
4. ~~A taxa do Stripe continua repassada ao cliente~~ — **decidido: removida.**
   Repassar taxa de cartão ao consumidor é proibido no Reino Unido desde
   13/01/2018 (*Consumer Rights (Payment Surcharges) Regulations 2012*), e o
   Stripe nunca chegou a cobrá-la: ela só inflava o total gravado no pedido,
   acima do dinheiro efetivamente recebido.
5. **Estoque controlado por você, não pelo sistema.** O `Product` tem campo,
   mas não vou bloquear venda por falta — com tiragem pequena, vender a mais e
   avisar costuma custar menos que perder venda por contagem errada.

## Verificação

QA em produção com pedido de teste real, incluindo o pagamento quando a chave
existir. Enquanto não existir, o QA cobre tudo até a criação do pedido e marca
o pagamento como não testado — explicitamente, não por omissão.
