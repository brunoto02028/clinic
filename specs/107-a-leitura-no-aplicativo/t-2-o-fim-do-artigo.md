# T-2: Quem terminou de ler quer o próximo

**Status:** 🟢 concluída (29/09) — QA aprovado, achados corrigidos
**Depende de:** T-1 (reaproveita o cartão)

## Objetivo

Que o fim de um artigo seja uma porta, e não uma parede.

## Contexto

> *"Ao final de cada artigo, dá pra colocar atalhos para outros, algo assim?"*

Hoje o artigo acaba nas Referências e termina. Quem gostou de ler não recebe
nada — nem o próximo, nem o caminho de volta.

## A decisão que importa

A clínica tem poucas dezenas de textos. "Relacionado" por semelhança exigiria
saber o que se parece com o quê, e com esse volume a conta erra mais do que
acerta — e recomendação errada num texto clínico não é só irrelevante, é
estranha. O que é honesto agora:

- **o próximo da mesma categoria**, que é uma relação que existe de verdade;
- **voltar para a lista**, que hoje só existe pela seta do cabeçalho.

## Passos

1. Ao fim do corpo do artigo, uma seção "Continue reading" / "Continue lendo".
2. Até três itens da **mesma categoria**, excluindo o atual, no cartão da T-1
   em formato reduzido.
3. Sem categoria, ou sem outros nela: os mais recentes, e o título diz isso —
   nunca fingir relação que não existe.
4. Nada disponível: a seção **não aparece**. Seção vazia é pior que ausente.
5. Abaixo dela, o caminho de volta para a lista.
6. Marcar como lido, se existir, continua onde está; isto não o substitui.

## Arquivos afetados
- `mobile/app/(app)/(clinica)/education/[id].tsx`
- `mobile/src/api/education.ts`
- `__tests__/education/o-fim-do-artigo.test.ts`

## O defeito que o QA achou, e que era o próprio objetivo da tarefa

O "See all materials" estava **dentro** do bloco das sugestões, depois do
`return null`. Quem era o único material da clínica ficava sem saída nenhuma no
fim do artigo — exatamente o que esta tarefa existia para corrigir.

Seção vazia continua sumindo. O caminho de volta é que deixou de depender dela.

## Critérios de aceite
- [x] Até três, mesma categoria, sem repetir o atual.
- [x] Sem candidatos, a seção **some do DOM** — medido, não deduzido.
- [x] O título nunca promete relação que não foi medida.
- [x] Há caminho de volta **mesmo sem sugestões** (achado do QA).
- [x] O voltar do aparelho retorna ao artigo anterior, não à lista.
