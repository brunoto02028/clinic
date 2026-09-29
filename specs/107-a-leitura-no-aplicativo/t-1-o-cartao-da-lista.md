# T-1: O cartão que não decide entre foto e texto

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

Que a lista de Education pareça uma lista de leitura, e não um formulário.

## Contexto

Hoje: miniatura de ~64×64 na esquerda, título quebrando em **três linhas** no
espaço que sobra, descrição cortada no meio de uma palavra (*"History is full of
treatments that doctor…"*), duas etiquetas disputando a linha de baixo — e dois
terços da tela vazios abaixo dos cartões.

A foto é pequena demais para dizer o que é, e o espaço que ela rouba é
exatamente o que faltou ao título.

## Passos

1. A imagem vira capa: largura inteira do cartão, proporção fixa (16:9), topo
   arredondado junto com o cartão.
2. Título abaixo da imagem, com espaço para duas linhas sem apertar.
3. Descrição em duas linhas, cortada em palavra inteira — nunca no meio de uma.
4. Etiquetas embaixo, e "Required" continua distinguível de "article": uma é
   obrigação, a outra é formato.
5. Cartão **sem** imagem não vira um buraco cinza: ocupa a largura toda com o
   texto, que é o que ele tem.
6. A seta de "abre" some — o cartão inteiro já é o alvo, e ela estava tirando
   largura do título.

## Arquivos afetados
- `mobile/app/(app)/(clinica)/education.tsx`
- um componente de cartão, se as duas listas o compartilharem

## Critérios de aceite
- [ ] A imagem ocupa a largura do cartão, medida em pixels.
- [ ] O título cabe em duas linhas nos textos reais da clínica.
- [ ] Nenhum corte no meio de palavra.
- [ ] Cartão sem imagem continua apresentável.
- [ ] Medido nas duas listas, claro e escuro.
