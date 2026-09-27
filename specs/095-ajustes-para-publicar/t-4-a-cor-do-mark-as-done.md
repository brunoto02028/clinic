# T-4: A cor do "Mark as done"

**Status:** pendente
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
