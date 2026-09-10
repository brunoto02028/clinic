# T-6: 1RM (Epley) + curvas de composição no Progresso

**Status:** pendente
**Depende de:** T-1, T-22/T-24 (atividade 20)

## Objetivo
Enriquecer o painel de Progresso do personal com força estimada e composição.

## Passos
1. Estimativa de 1RM por Epley a partir dos `WorkoutSetLog` (melhor set por exercício), no endpoint de progresso.
2. Dobrar no painel (T-24) as curvas de peso/%GC/cintura da `StudentAssessment`.

## Arquivos afetados
- app/api/admin/workouts/progress/route.ts, components/workouts/workout-progress.tsx (ou novo card)

## Critérios de aceite
- [ ] 1RM estimado aparece por exercício; curvas de composição no progresso.
