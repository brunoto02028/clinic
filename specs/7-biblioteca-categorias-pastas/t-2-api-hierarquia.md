# T-2: API de pastas com hierarquia

**Status:** concluído (QA aprovado, aguardando code review)
**Depende de:** T-1

## Objetivo

As rotas de pasta passam a entender categoria e pasta, com as validações que
impedem uma árvore inválida.

## Contexto

Decisões 2, 3 e 6 do plano. O `POST` atual já tem o fallback de `clinicId` para
Global View — preservar, foi correção de um bug real em que nenhuma pasta era
criada nessa visão.

## Passos

1. **`GET /api/admin/exercise-folders`**
   - Retornar a árvore: categorias com `children`, e em cada nó
     `exerciseCount` (vídeos ativos diretos) e, na categoria,
     `folderCount` + `totalExerciseCount` (soma dos filhos).
   - Aceitar `?flat=true` para a lista simples que os seletores já usam, sem
     quebrar quem consome hoje.

2. **`POST`** — aceitar `{ name, parentId? }`
   - `parentId` ausente → cria categoria.
   - `parentId` presente → validar que o pai existe, é da mesma clínica e é
     **categoria** (`parent.parentId === null`). Senão `400`, mensagem
     `"Folders can only be nested one level deep"`.
   - Unicidade por `(clinicId, parentId, name)`, não global — ver S2.

3. **`PATCH /api/admin/exercise-folders/[id]`** — passa a aceitar `parentId`
   além de `name`, permitindo **mover** uma pasta entre categorias.
   - Rejeitar mover uma categoria para dentro de outra se ela tiver filhos
     (viraria nível 3).
   - Rejeitar `parentId === id` (auto-pai).

4. **`DELETE /api/admin/exercise-folders/[id]`** — hoje já tem
   `?withExercises=true`. Acrescentar o caso categoria:
   - Sem flag: sobe os filhos para a raiz (`parentId = null`) e deleta.
   - `?withExercises=true`: desativa os exercícios de toda a subárvore
     (`isActive: false`) e deleta a categoria (cascade leva as pastas).
   - Resposta ganha `deletedFolders` além do `deletedExercises` que já retorna.

5. **`POST /api/admin/exercises`** e `bulk` — rejeitar criação sem `folderId`
   (`400`, `"An exercise must belong to a folder"`), e validar que o
   `folderId` aponta para uma **pasta**, não uma categoria.

## Arquivos afetados

- `app/api/admin/exercise-folders/route.ts`
- `app/api/admin/exercise-folders/[id]/route.ts`
- `app/api/admin/exercises/route.ts`
- `app/api/admin/exercises/bulk/route.ts`

## Critérios de aceite

- [ ] `GET` devolve árvore com contagens corretas (soma dos filhos bate com o total)
- [ ] `POST` com `parentId` de uma pasta → `400`
- [ ] `POST` com nome repetido em categorias diferentes → aceita as duas
- [ ] `PATCH` movendo pasta entre categorias funciona; auto-pai → `400`
- [ ] `DELETE` sem flag sobe os filhos para a raiz, não os apaga
- [ ] `DELETE` com `?withExercises=true` desativa a subárvore inteira
- [ ] Criar exercício sem `folderId` → `400`
- [ ] `GET ?flat=true` continua servindo os seletores existentes
