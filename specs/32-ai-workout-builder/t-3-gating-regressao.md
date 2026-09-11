# T-3: Gating + regressão

**Status:** concluído
**Depende de:** T-1, T-2

## Objetivo
Confirmar que a geração por IA é gated como o resto de treino, não introduz escrita indevida, e não regride o fluxo manual do builder.

## Passos
1. Confirmar `assertTrainingAccess`/`assertPatientAccess` cobrindo a rota (tenant CLINIC sem TRAINING → 404; aluno de outro tenant → 404).
2. Confirmar zero escrita no banco durante a geração (só leitura de Exercise + rate limit em memória); a escrita só acontece no `POST /api/admin/workouts` normal (já testado na atividade de treino).
3. Regressão: criar/editar treino manualmente (sem usar IA) continua idêntico.

## Critérios de aceite
- [ ] Gate confirmado (404 cross-tenant/CLINIC sem módulo).
- [ ] Nenhuma linha de `Workout`/`WorkoutExercise` criada pela rota de geração.
- [ ] Fluxo manual do WorkoutBuilder sem regressão.
