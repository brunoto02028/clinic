# T-4: UI admin + nav (seção Challenges)

**Status:** concluído
**Depende de:** T-3

## Objetivo
Seção top-level "Challenges" no admin do personal (studio-wide) para criar/listar desafios e ver o leaderboard.

## Contexto
`admin-sections.ts` só tem `clinicalOnly`. Adicionar `personalOnly?: boolean` (espelhando `clinicalOnly`) e ensinar `visibleAdminSections(isPersonal)` a dropar seções/tabs `personalOnly` quando **não** for personal.

## Passos
1. `lib/admin-sections.ts`:
   - Adicionar `personalOnly?: boolean` em `AdminSection` e `AdminTab`.
   - **G7 (crítico):** `visibleAdminSections` hoje faz `if(!isPersonal) return ADMIN_SECTIONS` (early-return sem filtro) → uma seção `personalOnly` VAZARIA para clínicas. Substituir por um filtro que, no ramo `!isPersonal`, **dropa `s.personalOnly` e tabs `personalOnly`** e refiltra seções vazias (espelhando o que o ramo isPersonal faz com `clinicalOnly`). Conferir `getActiveAdminNav` e qualquer outro consumidor de `ADMIN_SECTIONS` cru.
   - Nova seção `{ key:"challenges", label:"Challenges", labelPt:"Desafios", icon: Trophy, personalOnly:true, tabs:[{key:"list", label:"Challenges", href:"/admin/challenges"}], matchRoutes:["/admin/challenges"] }`.
2. `app/admin/challenges/page.tsx` + `components/challenges/challenges-admin.tsx`:
   - Lista de desafios (título, métrica, target, janela, status, nº participantes).
   - Form criar (título, descrição, métrica WORKOUT_COUNT/MEAL_LOG_DAYS, target, datas).
   - Abrir um desafio → leaderboard (aluno, progresso/target, %, completo).
   - Archive/editar.
3. Labels via relabel; inglês UK.

## Arquivos afetados
- `lib/admin-sections.ts`
- `app/admin/challenges/page.tsx` (novo), `components/challenges/challenges-admin.tsx` (novo)

## Critérios de aceite
- [ ] Seção "Challenges" aparece só para personal; some para clínica (novo flag funciona; regressão: clínica mantém suas seções).
- [ ] Criar/editar/arquivar desafio; leaderboard exibido e ordenado.
- [ ] Sem vazamento de vocab clínico.
