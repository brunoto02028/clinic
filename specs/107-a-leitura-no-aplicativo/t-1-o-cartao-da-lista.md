# T-1: O cartão que não decide entre foto e texto

**Status:** 🟢 concluída (29/09) — QA aprovado, achados corrigidos
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

## O corte que o React Native não sabe fazer

`numberOfLines` corta onde o pixel acaba, e isso cai onde cair — foi assim que
"doctors" virou "doctor…". Não dá para pedir a ele que respeite palavra.

Então o corte passou a ser nosso, **antes**: `cortarEmPalavra`. O
`numberOfLines` ficou só como rede, para fonte de aparelho maior que a prevista.

O QA mostrou que a régua precisava de dois valores: cartão **sem** capa tem
308,67px em vez de 354,67, porque o ícone do tipo come 46px. Com 110 caracteres
em 5 de 9 casos a terceira linha nascia e a rede a descartava — ou seja, quem
cortava voltava a ser o `numberOfLines`. O limite passou a acompanhar a largura.

## Critérios de aceite
- [x] A imagem ocupa a largura do cartão — **380,67px** contra 380,67px.
- [x] Proporção 16:9 medida: **1,7778**, inclusive com foto de origem em 1,498.
- [x] O título mais longo da clínica (92 caracteres) cabe em **2,000 linhas**.
- [x] Nenhuma das nove descrições cortada no meio de palavra.
- [x] Cartão sem imagem continua apresentável.
- [x] Claro e escuro: pior contraste **4,57** e **6,08**, os dois passam AA.
- [x] Zero setas em 10 cartões.
