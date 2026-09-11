# T-4: UI (catálogo + food-picker no meal builder)

**Status:** concluído
**Depende de:** T-3

## Objetivo
Gerenciar o catálogo de alimentos e montar refeições escolhendo alimentos com preview de macros.

## Passos
1. Nav: seção top-level `personalOnly` "Nutrition" em `admin-sections.ts` (reusa o flag da ativ.29) → `/admin/nutrition`.
2. `app/admin/nutrition/page.tsx` (guarda server-side não-personal → redirect) + `components/nutrition/food-catalog.tsx`: listar/criar/editar/soft-delete alimentos (nome, basis PER_100G|PER_UNIT, unitLabel, kcal/proteína/carbo/gordura).
3. `components/nutrition/meal-plan-panel.tsx`: no editor de refeição, um **food-picker** — escolher alimento do catálogo + quantidade; **preview dos macros calculados** (read-only) substitui os campos manuais quando há alimentos; botão "adicionar alimento". Uma refeição alterna entre "por alimentos" e "macros manuais" (trocar p/ manual envia `foods:[]`).
   - **G2:** os alimentos já vinculados à refeição são renderizados mesmo se o Food ficou inativo (marcado "inactive") e são preservados ao salvar; só o **picker de adicionar** filtra `isActive`.
4. Envia `foods` por refeição no POST/PUT; labels via relabel.

## Arquivos afetados
- `lib/admin-sections.ts` (seção Nutrition personalOnly)
- `app/admin/nutrition/page.tsx`, `components/nutrition/food-catalog.tsx` (novos)
- `components/nutrition/meal-plan-panel.tsx` (food-picker + preview)

## Critérios de aceite
- [ ] Catálogo: CRUD funciona; soft-delete some do picker.
- [ ] Meal builder: escolher alimentos + qtd → macros calculados exibidos; salvar persiste e o total bate.
- [ ] Refeição manual (sem alimentos) ainda salva com macros digitados.
- [ ] Seção/página só para personal; sem vocab clínico.
