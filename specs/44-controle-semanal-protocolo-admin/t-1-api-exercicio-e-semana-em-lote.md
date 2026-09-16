# T-1: API — ligar exercício ao item + liberar/esconder semana em lote

**Status:** implementado — aguardando QA
**Depende de:** nenhuma

## Objetivo
O `PATCH /api/admin/patients/[id]/protocol` passa a: (a) aceitar `exerciseId` no update de item de
forma validada, e (b) liberar/esconder vários itens de uma vez numa chamada só.

## Contexto
Ver plan.md, decisões 1 e 4. Hoje `itemUpdate` passa por `pickEditable("ProtocolItem", …)`
(`lib/tenant-field-guard.ts`), que descarta chaves estrangeiras — `exerciseId` some em silêncio. E o
`newItem` aceita `exerciseId` sem nenhuma checagem (linha ~394), o que deixaria ligar um exercício
de outra clínica.

## Passos
1. Em `app/api/admin/patients/[id]/protocol/route.ts`, criar um helper local
   `resolveExerciseId(value, protocolClinicId)`: `undefined` → não mexe; `null`/`""` → desliga;
   string → busca o `Exercise` e só aceita se existir e `exercise.clinicId === protocolClinicId`,
   senão responde 400 ("Exercise not found in this clinic").
2. No ramo `itemId && itemUpdate`: além do `pickEditable`, se `"exerciseId" in itemUpdate`, resolve
   pelo helper (clínica do protocolo do item) e inclui no `data`.
3. No ramo `newItem && protocolId`: passar `newItem.exerciseId` pelo mesmo helper (clínica do
   protocolo) em vez de gravar direto.
4. Novo ramo `bulkHidden: { itemIds: string[], hidden: boolean }` (junto com `protocolId`): confere
   que o protocolo é do paciente (`recordOfPatient`), faz um único `updateMany` com
   `where: { id: { in: itemIds }, protocolId }` (itens de outro protocolo simplesmente não entram) e
   devolve `{ success, count }`. Validar: `itemIds` array não vazio (máx. 200), `hidden` boolean.

## Arquivos afetados
- `app/api/admin/patients/[id]/protocol/route.ts`

## Critérios de aceite
- [ ] `itemUpdate: { exerciseId: <exercício da clínica> }` liga; `GET` do paciente passa a trazer
      `item.exercise` com esse exercício
- [ ] `itemUpdate: { exerciseId: null }` desliga
- [ ] `exerciseId` inexistente ou de outra clínica → 400, item não muda
- [ ] `newItem` com `exerciseId` de outra clínica → 400, nada criado
- [ ] `bulkHidden` esconde/libera todos os itens informados numa chamada; `count` bate
- [ ] `bulkHidden` com id de item de outro protocolo/paciente → esse item não é alterado
- [ ] `bulkHidden` com corpo inválido → 400
- [ ] `npx tsc --noEmit` limpo nos arquivos tocados
