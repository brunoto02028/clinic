# T-1: Fechar o catálogo de exames e parar de devolver custo

**Status:** pendente
**Depende de:** nenhuma

## Objetivo
Exigir autenticação em `labs/catalog` e `labs/catalog/[id]`, e parar de enviar preço de custo e identificador do fornecedor para o cliente.

## Contexto
`app/api/mobile/labs/catalog/route.ts` hoje não tem **nenhuma** checagem de autenticação: sem `getMobileUser`, sem `getMobileActor`, sem 401 em lugar nenhum. `curl` sem header devolve 200. O mesmo vale para `labs/catalog/[id]`.

Pior que o acesso aberto é o que ele devolve. O `findMany` não tem `select`, então vai a linha inteira — `costPrice` (preço de custo) e `lmlProductId` (id do produto no fornecedor LML) incluídos. Qualquer pessoa na internet obtém a margem de cada exame.

São os dois únicos endpoints mobile sem auth que não deveriam estar nessa lista — `login`, `logout`, `refresh` e `register` são públicos por definição.

`LabProduct` não tem `clinicId`: é catálogo global, sem vazamento entre tenants. O problema é comercial.

## Passos
1. Ler `mobile/app/(app)/(lab)/` e confirmar quais campos o app realmente usa.
2. Adicionar guard de autenticação nos dois endpoints, no padrão das rotas irmãs (401 com `corsJson`).
3. Trocar o `findMany` por um `select` explícito só com os campos consumidos. Nunca `costPrice`, `lmlProductId` ou `lastSyncedAt`.
4. Mesmo tratamento no `labs/catalog/[id]`.
5. Conferir se alguma tela web consome esses endpoints antes de mudar o contrato.

## Arquivos afetados
- `app/api/mobile/labs/catalog/route.ts`
- `app/api/mobile/labs/catalog/[id]/route.ts`
- `mobile/src/api/labs.ts` e telas de `(lab)` (se o tipo mudar)

## Critérios de aceite
- [ ] `curl` sem header nos dois endpoints devolve 401
- [ ] Resposta autenticada não contém `costPrice`, `lmlProductId` nem `lastSyncedAt`
- [ ] Telas de Lab no app continuam funcionando com o `select` reduzido
- [ ] Nenhum consumidor web quebrado
