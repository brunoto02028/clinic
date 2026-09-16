# T-5: `sentToPatientAt` preservado + duplicar item com exercício de fora

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
A data real do envio não é sobrescrita por edições, e duplicar um item nunca falha por causa do
exercício ligado.

## Contexto
Ver plan.md (situação atual, últimos dois itens).

## Passos
1. `app/api/admin/patients/[id]/route.ts`, ação `edit_protocol`: gravar `sentToPatientAt` só se o
   protocolo ainda não tem essa data (ler o atual antes).
2. `components/admin/protocol-items-by-week.tsx`, `duplicate`: se a API responder
   "Exercise not found in this clinic", repetir sem `exerciseId` e avisar "copied without the linked
   exercise (not in this clinic's library)". Para isso, o `patch` do componente passa a devolver o
   erro em vez de só exibi-lo, nesse caso.

## Arquivos afetados
- `app/api/admin/patients/[id]/route.ts`
- `components/admin/protocol-items-by-week.tsx`

## Critérios de aceite
- [x] Salvar um protocolo enviado pela seção de protocolos da aba Avaliações não muda
      `sentToPatientAt`
- [x] Protocolo que nunca teve data de envio e é salvo como SENT pela primeira vez ganha a data
- [x] Duplicar item com exercício da clínica: igual antes (cópia ligada)
- [x] Duplicar item com exercício de fora: cópia criada sem vínculo + aviso, sem mensagem de erro
