# T-4: O markdown que o paciente lê cru

**Status:** pendente
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

## Critérios de aceite
- [ ] `_x_` vira itálico, `**x**` vira negrito.
- [ ] `snake_case` **não** vira itálico.
- [ ] Marcação não fechada aparece literal, sem engolir o resto do parágrafo.
- [ ] Vale em parágrafo, lista e citação.
