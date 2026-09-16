# T-4: Teste `admin-sections-gating` alinhado ao commit 31435a0

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
A suíte de testes volta a passar inteira.

## Contexto
O commit 31435a0 (12/09) escondeu a aba "Treatments" do personal trainer de propósito (o checkout
usa o Stripe da clínica, não o Connect do personal). O teste ainda espera "treatments" entre as abas
do personal.

## Passos
1. Conferir em `lib/admin-sections.ts` que "treatments" é `clinicalOnly`/escondida para personal.
2. Atualizar o teste: "treatments" **não** aparece para personal; "exercises", "list",
   "challenges-list" continuam; e aparece para clínica.

## Arquivos afetados
- `__tests__/tenant/admin-sections-gating.test.ts`

## Critérios de aceite
- [x] `npx jest` sem falhas
