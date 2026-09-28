# T-4: A cor do "Mark as done"

**Status:** feita (27/09) — em QA
**Depende de:** nenhuma

## Objetivo

O botão que conclui o exercício está, nas palavras do Bruno, *"marrom e com uma
leitura muito ruim"*. Trocar por uma cor que se leia — e provar com número, não
com opinião.

## Contexto

`mobile/app/(app)/(clinica)/exercise/[id].tsx` usa o `Button` padrão, cuja cor
vem de `primary` no tema: `ink` (#20242D) no claro, `bone` (#F5F4F1) no escuro.
Nenhum dos dois é marrom — então **a primeira coisa é descobrir qual cor está
saindo de verdade** no telefone dele: pode ser o estado de carregando, o
`greige` (#CDC7BE), ou um tom que o tema escuro compõe.

Já troquei uma cor aqui anunciando melhora e entreguei contraste **pior** (4,9
para 3,2). Desta vez: medir a atual, medir a nova, mostrar os dois números.

## Passos

1. Capturar a tela no aparelho, nos dois temas, e **ler o pixel** do botão.
2. Calcular o contraste do texto sobre ele (WCAG AA pede 4,5:1 para texto
   normal; para botão grande, 3:1).
3. Propor a cor — a primeira candidata é o moss da clínica (#4F7361) com texto
   branco, que é a cor do produto — e medir.
4. Mostrar os dois números ao Bruno **antes** de aplicar.
5. Aplicar onde o botão de concluir aparece: exercício, tarefas, protocolo.

## Arquivos afetados

- `mobile/src/theme/index.ts` / `tokens.ts`
- `mobile/src/components/ui/Button.tsx` (se for variante, não token)
- as três telas que concluem algo

## Critérios de aceite

- [ ] O contraste da cor atual está medido e escrito
- [ ] O da nova também, e é maior
- [ ] Os dois temas foram olhados
- [ ] O Bruno viu os números antes de aplicar

---

## A medição, antes e depois

O botão vinha na variante **padrão** do `Button`, que é `greige` — `#CDC7BE` no
tema claro, um bege quente que se lê como marrom. Era isso.

Mas o texto dentro dele estava em **9,42:1**, bem acima do exigido. **Não era
legibilidade de texto.** Era o botão sumindo no fundo:

| | contra o fundo | texto dentro |
|---|---|---|
| greige, tema claro | **1,53:1** | 9,42:1 |
| greige, tema escuro | **1,29:1** | — |
| **health (moss), claro** | **4,82:1** | 5,31:1 |
| **health (moss), escuro** | **5,85:1** | 5,85:1 |

A regra para um controle é **3:1 contra o que está atrás dele** (WCAG 1.4.11). A
1,5:1 ele não parece um botão — parece um retângulo bege sobre um fundo bege, e
é por isso que a leitura ficou "muito ruim" mesmo com o texto legível.

`health` é o **moss da própria clínica** (#4F7361 no claro, #7FA890 no escuro), e
o `Button` já tinha essa variante. A mudança é uma palavra por botão: a cor do
produto na ação principal do produto.

**Onde entrou:** concluir o exercício e concluir o conteúdo — a mesma ação. Em
`tasks` e `treatment-protocol` o "concluir" é um `Alert` nativo do sistema, que
não aceita cor nossa.

**O que eu não pude fazer:** ler o pixel no aparelho dele. A medição é sobre os
tokens do tema, que é o que o aparelho desenha — e o número que explicava a
queixa apareceu ali. Se no telefone estiver diferente, é outro defeito, e a
medida acima é o ponto de partida para achá-lo.
