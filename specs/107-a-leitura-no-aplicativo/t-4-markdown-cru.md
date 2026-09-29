# T-4: O markdown que o paciente lê cru

**Status:** 🟢 concluída (29/09) — QA aprovado, achados corrigidos
**Depende de:** nenhuma

## Objetivo

Que marcação vire formatação, ou não apareça.

## Contexto

Na seção de referências o paciente lê, com os sublinhados na tela:

> Banks, K. (2013) \_Maitland's Peripheral Manipulation Management.\_ Elsevier.

`ArtigoEmBlocos` trata os **blocos** — título, parágrafo, lista, citação, imagem,
separador — e nada dentro do parágrafo. Itálico (`_texto_`) e negrito
(`**texto**`) passam como texto literal.

Numa lista de referências o itálico não é enfeite: é o que separa o título da
obra do resto da citação. Sem ele, e com os sublinhados no meio, a citação fica
pior do que ficaria em texto puro.

## Passos

1. Uma função pura que quebra um parágrafo em pedaços — normal, itálico,
   negrito — com teste nos casos que mordem: sublinhado no meio de palavra
   (`snake_case`), asterisco solto, marcação não fechada, aninhada.
2. `ArtigoEmBlocos` usa isso em parágrafo, item de lista e citação.
3. Marcação não fechada é impressa como está: inventar o fechamento muda o
   texto de quem escreveu.
4. Medido nos protocolos reais, que são o conteúdo que tem citação.

## Arquivos afetados
- `mobile/src/lib/texto-em-pedacos.ts` (novo)
- `mobile/src/components/ArtigoEmBlocos.tsx`
- `__tests__/education/markdown-no-paragrafo.test.ts`

## Duas coisas que só apareceram medindo

1. **`3 * 4 * 5` virava "3 4 5".** O padrão aceitava espaço em volta do
   conteúdo, então os asteriscos de multiplicação viravam ênfase. Resolvido
   exigindo que o conteúdo não comece nem termine em espaço.
2. **Na citação o itálico era invisível** (achado do QA): o bloco inteiro já é
   itálico, e `_título_` saía itálico dentro de itálico. Ênfase dentro de texto
   inclinado volta ao **normal** — é a convenção tipográfica, e é a única que se
   enxerga.

## Critérios de aceite
- [x] `_x_` vira itálico, `**x**` vira negrito.
- [x] `snake_case`, `campo_id` e `3 * 4 * 5` continuam literais.
- [x] Marcação não fechada aparece literal, sem engolir o parágrafo.
- [x] Vale em parágrafo, lista e citação — e na citação **inverte**.
- [x] Nas referências reais: 0 sublinhados e 0 underscores visíveis.
