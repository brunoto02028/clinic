# T-1: Backend — filtro `folderId` no GET de exercícios

**Status:** concluído
**Depende de:** nenhuma

## Objetivo

`GET /api/admin/exercises` passa a aceitar `?folderId=<id>`, devolvendo
só os exercícios ativos daquela pasta — o que a grade de miniaturas da
T-2 precisa pra listar o conteúdo de uma pasta.

## Contexto

- `app/api/admin/exercises/route.ts:21-` monta um `where` com
  `isActive: true, clinicId` e então acrescenta filtros opcionais
  (`bodyRegion`, `difficulty`, `search`, `translated`). Falta só
  `folderId` nessa lista.
- O clinicId já é resolvido por `resolveClinicId(session)` e **falha
  fechado** (`403` quando não resolve) — o filtro novo entra depois
  disso, então não abre caminho pra ler pasta de outro tenant. Mesmo
  assim, um `folderId` de outra clínica deve devolver lista vazia, não
  o conteúdo alheio: como o `where` já carrega `clinicId`, isso sai de
  graça (a interseção dá vazio) — confirmar no QA em vez de assumir.
- O modo `?all=true` (mesmo arquivo, linhas ~65-82) já retorna
  exatamente os campos que a grade quer: `id`, `name`, `bodyRegion`,
  `difficulty`, `thumbnailUrl`, `videoUrl`, `defaultSets`,
  `defaultReps`, `defaultHoldSec`, `defaultRestSec`. A T-2 vai chamar
  `?folderId=X&all=true` — não precisa mudar o shape da resposta.

## Passos

1. Ler `folderId` dos `searchParams`.
2. Se presente e não vazio, acrescentar `where.folderId = folderId`.
3. Conferir que o filtro vale tanto no caminho `all=true` quanto no
   paginado (ambos usam o mesmo objeto `where`).

## Arquivos afetados

- `app/api/admin/exercises/route.ts`

## Critérios de aceite

- [ ] `?folderId=<id>&all=true` devolve só os exercícios daquela pasta.
- [ ] Sem `folderId`, a resposta é idêntica à de hoje (sem regressão na
      Biblioteca de Exercícios, que usa o mesmo endpoint).
- [ ] `folderId` de pasta vazia devolve `{exercises: []}`, não erro.
- [ ] `folderId` de outra clínica devolve lista vazia (nunca o conteúdo
      da outra clínica).
- [ ] Exercício inativo (`isActive: false`) não aparece.
