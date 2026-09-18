# T-6: Gating + regressão

**Status:** concluído
**Depende de:** T-1, T-2, T-3, T-4, T-5

## Objetivo
Confirmar que toda a área de templates é gated como o resto de treino, e que nada do fluxo manual existente (`WorkoutBuilder`, ativ.19/32) regrediu.

## Passos
1. Confirmar `assertTrainingAccess`/`assertPatientAccess` cobrindo todas as rotas novas (tenant CLINIC sem TRAINING → 404; aluno/template de outro tenant → 404, nunca o registro).
2. Regressão: criar/editar um `Workout` avulso manualmente (sem usar Program Templates) continua idêntico — nenhum campo novo é obrigatório, nenhuma tela existente muda de comportamento.
3. Regressão: `GET /api/mobile/workouts` continua funcionando pra aluno sem nenhum programa atribuído (só treinos manuais).
4. Conferir que apagar um `WorkoutTemplate` não apaga os `Workout` já atribuídos aos alunos (só desvincula `templateDayId`).

## Critérios de aceite
- [ ] Gate confirmado em todas as rotas novas (404 cross-tenant/CLINIC sem módulo).
- [ ] Fluxo manual do `WorkoutBuilder` sem regressão.
- [ ] Apagar template preserva os treinos já atribuídos.
