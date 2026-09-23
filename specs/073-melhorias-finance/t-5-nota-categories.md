# T-5: Nota de esclarecimento em Categories ("Deactivate" ≠ apagar)

**Status:** concluído
**Depende de:** nenhuma

## Objetivo

Evitar confusão de quem tenta "apagar de vez" uma categoria e só encontra
o botão de desativar (soft-delete, preserva histórico contábil).

## Contexto

Achado do QA — não é bug, só falta de clareza na UI.

## Passos

1. `app/admin/finance/page.tsx` (seção Categories) — texto/tooltip curto
   perto do botão de "olho"/desativar, tipo "Deactivating hides this
   category from new entries but keeps your accounting history — there's
   no permanent delete."

## Arquivos afetados

- `app/admin/finance/page.tsx`

## Critérios de aceite

- [ ] Texto visível sem precisar de hover obrigatório (ou tooltip claro
      o suficiente) — decidir na implementação qual fica melhor no
      layout existente.
