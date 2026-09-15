# T-4: UI admin — histórico/adesão por item

**Status:** concluído
**Depende de:** T-2

## Objetivo
O admin consegue ver, por item, quais dias a paciente marcou como feito.

## Contexto
Ver plan.md, decisão 4. Arquivo: `app/admin/patients/[id]/page.tsx`, aba Protocol (lista de
itens já existente, com "Hide from patient"/"Duplicate"/"Delete").

## Passos
1. Em cada item da lista, mostrar as datas marcadas (formato curto, ex: "14/09, 15/09") quando
   houver `completionLogs`; nada quando vazio.

## Arquivos afetados
- `app/admin/patients/[id]/page.tsx`

## Critérios de aceite
- [ ] Datas aparecem corretamente por item, batendo com o que a paciente marcou
- [ ] Item sem nenhum log marcado não quebra layout (fica em branco/omitido)
