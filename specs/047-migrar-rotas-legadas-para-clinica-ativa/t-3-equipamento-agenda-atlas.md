# T-3: Migrar equipamentos, agenda, Atlas e artigos

**Status:** concluído
**Depende de:** T-1

## Objetivo
As 7 chamadas restantes seguem a clínica ativa e falham fechado.

## Arquivos afetados
- `app/api/admin/equipment/route.ts`, `app/api/admin/equipment/[id]/route.ts`
- `app/api/admin/calendar/blocks/route.ts`
- `app/api/admin/atlas/treatment-plan/route.ts`
- `app/api/admin/patients/[id]/atlas-treatment-plan/route.ts` (hoje usa `|| ""`)
- `app/api/admin/articles/instagram/route.ts`

## Critérios de aceite
- [x] Equipamentos: lista e edição só da clínica ativa; sem clínica → 403 (hoje `[]`)
- [x] Bloqueios de agenda criados e lidos na clínica ativa
- [x] Atlas monta o contexto com a clínica ativa, nunca com `""`
- [x] Importação de artigos do Instagram grava na clínica ativa
