# T-10: Painel do personal

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
O card "Trainers" conta o próprio personal (ADMIN que atende), e os ícones do estúdio não usam estetoscópio.

## Contexto
Achado P7.

## Passos
1. Contagem de treinadores do estúdio inclui ADMIN que atende (`bookable`).
2. Ícone da seção de treino/estúdio para o personal: haltere.

## Arquivos afetados
- `app/admin/page.tsx`
- `lib/admin-sections.ts` / mini-sidebar

## Critérios de aceite
- [ ] `/admin` do trainer: "Trainers" ≥ 1; sem estetoscópio.
