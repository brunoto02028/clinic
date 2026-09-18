# T-2: Página de vendas

**Status:** em andamento — implementada, aguardando deploy e QA
**Depende de:** T-1

## Rota escolhida

`/beyond-pain/buy`. Público é do Reino Unido, então a URL fica em inglês —
`/livro` apareceria no anúncio para quem lê em inglês. Mantém o livro no mesmo
namespace da página de captura, o que separa a medição sem espalhar rotas.

## Estado atual: pronta e sem carrinho

Duas chaves independentes precisam concordar para existir compra:
`BookConfig.status === "ON_SALE"` **e** `product.isActive`. Hoje nenhuma das
duas está ligada, então a página vende a ideia e oferece só o capítulo grátis.
O preço provisório de £19,99 **não aparece no HTML público** — mostrar preço
falso ao visitante seria enganoso.

## Objetivo

Uma página que recebe alguém vindo de um anúncio e o leva a comprar o livro,
sem passar por lugar nenhum antes.

## Contexto

`/beyond-pain` existe e é boa no que faz: captura o e-mail de quem quer o
primeiro capítulo grátis. Isso serve para tráfego frio de artigo, não para
tráfego pago de compra — quem clica num anúncio de livro chega decidido, e
oferecer "leia grátis" primeiro é entregar a venda de graça.

A página nova vive em rota própria para que o anúncio aponte direto para ela e
a conversão seja medível sem ruído.

## Passos

1. Rota própria (`/beyond-pain/comprar` ou `/livro` — decidir no momento,
   preferindo a que fica melhor num anúncio).
2. Estrutura de página de venda: promessa acima da dobra, capa, para quem é,
   o que muda depois de ler, sobre o autor, o que vem na entrega, prova
   social se houver, perguntas frequentes (prazo, devolução, entrega),
   e o botão de compra repetido ao longo da rolagem.
3. Preço, frete e prazo vindos do produto — nunca escritos no HTML, senão
   divergem do que o checkout cobra.
4. Compra sem conta: e-mail, endereço, pagar.
5. `metadata` e Open Graph próprios, para o link do Instagram mostrar capa e
   preço decentes.
6. Uma única saída alternativa, no rodapé: o capítulo grátis, para quem não
   vai comprar hoje virar lead em vez de sumir.
7. Responsiva de verdade — a maioria do tráfego do Instagram é celular.

## Arquivos afetados

- `app/beyond-pain/comprar/page.tsx` (novo)
- `components/book/` (novo, os blocos da página)
- `app/beyond-pain/page.tsx` (aponta para a nova quando estiver lançado)

## Verificado localmente (dev apontando para o banco de produção)

- Renderiza HTTP 200; sem rolagem lateral em 390 px
- Caixa de compra começa em 728 px, acima da dobra de 844 px
- Botão principal com 48 px de altura (alvo de toque adequado)
- Estado "à venda" conferido forçando o produto só no arquivo local, depois
  revertido: preço, "delivery included", formulário completo e "Buy the book"
- Estado atual não renderiza formulário de compra nenhum — os campos
  `Full name`/`Postcode` não existem no HTML
- `og:title`, `og:description`, `og:image` (a capa) e `<title>` corretos
- Evidências em `qa/screenshots/t-2-*.png`

## Observações para o tráfego pago (não corrigidas — são do site inteiro)

1. O banner de cookies cobre a caixa de compra no primeiro acesso em celular.
   Em tráfego pago isso fica entre o anúncio e a conversão.
2. O botão flutuante do WhatsApp fica sobre o canto da caixa de compra.

## Critérios de aceite

- [x] Um só objetivo: comprar
- [x] Preço e frete vêm do produto, nunca escritos no HTML
- [x] Compra sem criar conta (checkout de visitante corrigido na T-1)
- [x] Link compartilhado mostra capa e título corretos
- [x] Legível e clicável em tela de 390 px
- [x] Capítulo grátis presente, sem competir com a compra
- [ ] Abre em menos de 2,5 s no 4G simulado — medir em produção
- [ ] Fluxo de compra ponta a ponta — bloqueado pelo Stripe
