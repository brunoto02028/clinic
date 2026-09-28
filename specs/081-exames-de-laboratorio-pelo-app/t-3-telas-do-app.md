# T-3: Telas do app

**Status:** concluído — QA aprovado (qa/report-t-3-t-4.md) e revisão feita em 25/09/2026
**Depende de:** T-1 (as telas nascem contra catálogo semeado; T-6, T-7 e T-9 plugam a API depois)

## Objetivo
O caminho inteiro dentro do app: escolher, pagar, acompanhar, registrar o kit, ver o resultado.

## Contexto
Já existem 611 linhas de tela em `mobile/app/(app)/(lab)/` — catálogo, `[id]`, checkout, pedidos,
`order/[id]`, `result/[id]` e um `collection-method`. Foram escritas contra o modelo antigo, sem
registro de kit e sem resultado estruturado. É revisão, não folha em branco.

O módulo está escondido por `EXPO_PUBLIC_SHOW_LAB=false` no build de produção — e continua
escondido até a T-9.

## Passos
1. Catálogo: nome, o que mede, prazo, preço de venda. **Nunca o preço de custo.**
2. Detalhe do exame: biomarcadores, tipo de amostra, e a frase de que é picada no dedo, em casa.
3. Checkout: endereço e CEP, com o texto de que o kit vai pelo correio.
4. Acompanhamento com os estados de verdade — "kit a caminho", "registre seu kit", "amostra
   recebida", "no laboratório", "resultado pronto" — e não uma barra de progresso genérica.
5. Registro do kit: a tela que a T-4 expõe, com o código do kit e o telefone.
6. Resultado: biomarcadores com valor, unidade, faixa e marcação de fora da faixa; botão para o
   PDF, que abre **dentro do app** (o `FileViewer` da 076 já faz isso).
7. Tudo em EN e PT, inglês primeiro, com `tr(lang, …)`.
8. `collection-method.tsx` sai ou fica inerte: nesta atividade só existe um método de coleta.

## Arquivos afetados
- `mobile/app/(app)/(lab)/**`
- `mobile/src/api/labs.ts`

## Critérios de aceite
- [ ] O preço de custo não aparece em resposta nenhuma da API do app — conferido no JSON, não na tela
- [ ] Cada estado do pedido tem texto próprio, EN e PT
- [ ] Resultado não liberado não aparece — nem vazio, nem "em breve" que sugira que já existe
- [ ] PDF abre dentro do app
- [ ] `tsc` limpo no `mobile/`
