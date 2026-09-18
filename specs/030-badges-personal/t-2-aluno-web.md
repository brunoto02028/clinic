# T-2: Aluno (web)

**Status:** concluído
**Depende de:** T-1

## Objetivo
O aluno vê suas badges (ganhas + próximas com progresso) numa faixa em `/dashboard/challenges`.

## Passos
1. `app/api/badges/route.ts` (GET) → `assertStudentTrainingAccess`; `computeSignals(actor.userId, actor.clinicId)` → `earnedBadges(...)`; retorna a lista.
2. `components/challenges/student-challenges.tsx` → faixa de badges no topo (antes dos streaks ou junto): emoji + label; ganhas destacadas, não-ganhas esmaecidas com barra de progresso e tooltip da descrição. Buscar de `/api/badges` no load.
3. Sem plano de nutrição, `mealDays`/`mealStreak` = 0 (badges de refeição só não acendem — não quebra).

## Arquivos afetados
- `app/api/badges/route.ts` (novo)
- `components/challenges/student-challenges.tsx`

## Critérios de aceite
- [ ] Aluno com N treinos vê as badges de treino correspondentes acesas; as demais esmaecidas com progresso.
- [ ] Sem sessão → 401; tenant sem TRAINING → negado.
- [ ] Sem erro de console; faixa responsiva.
