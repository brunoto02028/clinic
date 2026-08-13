# T-1: Schema — `parentId` em ExerciseFolder

**Status:** concluído (QA aprovado, aguardando code review)
**Depende de:** nenhuma

## Objetivo

`ExerciseFolder` passa a se auto-referenciar, de modo que uma linha sem pai é uma
categoria e uma linha com pai é uma pasta.

## Contexto

Decisão 1 e 2 do plano: um modelo só, profundidade travada em 2 pela API (o
schema não tem como expressar esse limite). O projeto não usa pasta de migrations
— o deploy roda `prisma db push`.

## Passos

1. Em `prisma/schema.prisma`, no modelo `ExerciseFolder`:
   ```prisma
   parentId String?
   parent   ExerciseFolder?  @relation("FolderTree", fields: [parentId], references: [id], onDelete: Cascade)
   children ExerciseFolder[] @relation("FolderTree")

   @@index([parentId])
   ```
2. `onDelete: Cascade` no pai: apagar a categoria leva as pastas junto no banco.
   A escolha "apagar só a categoria" da T-2 sobe as pastas para a raiz **antes**
   de deletar, então o cascade nunca dispara nesse caminho.
3. Rodar `npx prisma generate` e conferir que o client tipa `parent`/`children`.
4. `npx prisma db push` contra o banco local para validar; produção só no deploy.

## Arquivos afetados

- `prisma/schema.prisma`

## Critérios de aceite

- [ ] `npx prisma generate` sem erro e `parentId` aparece no client gerado
- [ ] `npx prisma db push` aplica no banco local sem perda de dados
- [ ] Criar categoria → criar pasta com `parentId` → apagar a categoria remove as
      duas (comprova o cascade)
- [ ] `npx next build` compila
