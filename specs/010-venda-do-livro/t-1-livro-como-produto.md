# T-1: O livro como produto vendável

**Status:** em andamento — implementado, aguardando deploy e QA
**Depende de:** nenhuma

## Objetivo

Que o livro exista como algo que o checkout sabe cobrar e despachar — preço,
frete, imagem e estoque —, gerido por você no admin como qualquer outro
produto.

## Contexto

O `Product` já tem tudo de que a venda precisa: `price`, `shippingCost`,
`isDigital`, `imageUrl`, `images`, `costPrice`. O `/api/shop/checkout` já soma
`shippingCost` por unidade para produto não-digital e cria o pedido com
endereço.

Falta a linha do livro e um jeito de você mexer no preço sem depender de mim.

## Passos

1. Verificar se a tela de produtos do admin já permite criar e editar tudo o
   que o livro precisa; completar o que faltar em vez de criar tela nova.
2. Criar o produto do livro em produção, com a capa que já existe em
   `public/images/book/`.
3. Ligar o produto à configuração do livro (`buyLinkDirect` passa a apontar
   para a página de vendas, e o preço exibido vem do produto — hoje
   `priceDisplay` é texto solto e pode divergir do que o checkout cobra).
4. Conferir que o checkout calcula certo: preço + frete + taxa, e que o pedido
   nasce com o endereço.

## Arquivos afetados

- `app/api/shop/checkout/route.ts` (só se a conferência apontar erro)
- tela de produtos do admin (a localizar)
- dados de produção: a linha do produto

## Decisão do Bruno (15/08/2026)

Ambiente todo pronto, mas **o livro não pode ser comprado ainda**: preço
provisório (£19,99) e `isActive: false`. Frete embutido no preço, £0 no
checkout. Ele ainda vai cotar Evri e Parcel2Go antes de fechar o preço.

## Defeitos encontrados ao verificar

A verificação achou cinco problemas, nenhum deles previsto no plano:

1. **Compra de visitante devolvia 500.** `MarketplaceOrder.patientId` era
   obrigatório; a loja pública passava `null`. Ninguém sem conta BPR jamais
   conseguiu comprar.
2. **Sobretaxa de cartão ilegal.** `checkout/route.ts` somava 1,5% + £0,20 ao
   total. Proibido ao consumidor no Reino Unido — e o Stripe cobrava só
   `unitPrice + frete`, então a sobretaxa apenas inflava o total gravado.
3. **Preço inflado também no Stripe.** `admin/marketplace/products` criava o
   preço como `(price + 0,20) / (1 − 0,015)`.
4. **Pedido sem contato do comprador.** Nenhum campo de e-mail — impossível
   avisar quem não tem conta (bloquearia a T-4).
5. **Pedido de visitante invisível no admin.** A listagem filtra por
   `clinicId`, que a loja pública nunca preenchia.

Mais dois de menor gravidade: os dois checkouts divergiam em
`freeShippingOver` (só o do paciente aplicava), e a página de produto
anunciava "frete grátis acima de £50" inventado por um `|| 50`.

## Critérios de aceite

- [x] O livro existe como produto, comprável ao ser ativado
- [x] Preço e frete editáveis por você, sem deploy
- [x] O preço mostrado é o mesmo que o checkout cobra (sem sobretaxa)
- [x] Pedido criado com endereço completo, e com contato quando é visitante
- [x] Produto digital continua sem cobrar frete
- [ ] Verificado em produção após deploy (QA)
