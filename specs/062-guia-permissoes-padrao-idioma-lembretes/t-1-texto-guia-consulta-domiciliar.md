# T-1: Texto do guia (consulta domiciliar)

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Paciente que vai ter consulta em domicílio (ou qualquer paciente, já que o texto é genérico) vê
no guia a importância de preencher histórico/exames/relatórios antes da consulta.

## Contexto
`app/dashboard/guide/page.tsx` — card "Chegue à Consulta Preparado" (step 4), título e descrição
inline em `steps` (linhas ~102-110), texto hardcoded (não passa por `lib/i18n.ts`). Página 100%
estática. Ver `plan.md` decisão 1: texto genérico, não condicional por tipo de consulta.

Texto (PT/EN) já aprovado no `plan.md` — usar exatamente esse, a menos que o Bruno peça ajuste
depois de ver o rascunho.

## Passos
1. Adicionar o parágrafo (PT e EN) ao card do step 4 do guia, como um bullet/linha extra na lista
   de itens já existente (`Roupa confortável` / `Chegar 5 min mais cedo` / etc.) ou como um
   parágrafo curto logo abaixo da descrição do card — decidir durante a implementação o que fica
   visualmente mais limpo, sem quebrar o layout do card.
2. Conferir se existe uma versão em inglês do mesmo componente/página (a página pode ter uma
   rota ou branch separada para `en-GB` vs `pt-BR`, ou usar o mesmo componente com texto
   condicional por locale) — replicar a mesma adição nos dois lugares.

## Arquivos afetados
- `app/dashboard/guide/page.tsx`

## Critérios de aceite
- [ ] Texto novo aparece no guia, em português quando o paciente está em PT e em inglês quando
      está em EN.
- [ ] Layout do card não quebra em mobile (390px).
- [ ] `npx tsc --noEmit` e `npx next lint` limpos.
