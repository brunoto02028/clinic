# T-3: Frontend — colapsar categoria/subpasta de nome idêntico

**Status:** concluído
**Depende de:** nenhuma (independente da T-1/T-2)

## Objetivo

Parar de mostrar a mesma pasta duas vezes seguidas na lista do modal.

## Contexto

No screenshot do pedido, cada categoria aparece duplicada: "Advanced
Core — 10 videos" em negrito e, logo abaixo, indentado, "Advanced Core
— 10 videos" de novo. Mesma coisa com Fix Posture, Hip, Jiujitsu.

Não é bug de renderização: `patient-exercises-tab.tsx` (linhas ~222-251)
desenha uma linha pra categoria e uma linha pra cada filho, e essas
categorias têm exatamente **1 subpasta com o mesmo nome** delas. O
resultado é correto e inútil ao mesmo tempo — duas linhas que levam ao
mesmo conjunto de vídeos.

Regra: categoria com exatamente um filho cujo nome é igual (comparação
sem diferenciar maiúsculas e espaços nas pontas) → desenhar só uma
linha, apontando pra **categoria**.

> **Corrigido depois do code review.** A primeira versão apontava pro
> **filho**, sob a ideia de que era ele quem guardava os vídeos. Só que
> uma categoria também pode ter vídeos direto nela — é o que acontece
> quando se deleta uma categoria e as subpastas são promovidas com os
> vídeos dentro (`exercise-folders/[id]` DELETE). Apontando pro filho,
> esses vídeos continuavam contados na árvore mas ficavam sem nenhuma
> linha que chegasse neles: invisíveis na grade e impossíveis de
> prescrever. No limite, categoria com vídeos + subpasta espelhada
> vazia virava uma linha escrita "empty" e desabilitada.
>
> Apontar pra categoria não perde nada: com a T-1, o id da categoria
> alcança as subpastas tanto no GET quanto na prescrição. E o count
> exibido passa a ser o `totalExerciseCount`, que é o número honesto.
>
> Em produção, no dia da mudança, as 11 categorias espelhadas tinham 0
> vídeos diretos — ninguém estava sendo afetado, era armadilha esperando
> a primeira exclusão de categoria.

Categorias com vários filhos, ou com filho de nome diferente, continuam
exatamente como estão hoje — nada de esconder pasta.

## Passos

1. Ao montar a lista, detectar o caso "1 filho, mesmo nome".
2. Nesse caso, renderizar uma linha só (estilo de categoria, id do filho).
3. Deixar claro no código por que a regra existe, senão vira mistério na
   próxima leitura.

## Arquivos afetados

- `components/admin/patient-exercises-tab.tsx`

## Critérios de aceite

- [ ] Categoria com 1 subpasta de mesmo nome aparece uma vez só.
- [ ] Prescrever por essa linha prescreve o mesmo conjunto de antes.
- [ ] Categoria com 2+ subpastas continua mostrando todas.
- [ ] Categoria com 1 subpasta de nome diferente continua mostrando as duas.
- [ ] Nenhuma pasta some da lista em nenhum dos casos.
