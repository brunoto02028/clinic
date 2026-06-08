# T-2: Tarefas (lista + concluir)

**Status:** concluído (QA report-t-2.md aprovado)
**Depende de:** T-1

## Objetivo
Tela de tarefas do paciente: lista e ação de marcar como concluída.

## Passos
1. Tela `(app)/tasks.tsx`: GET `/api/patient/tasks` (lista) + PATCH (taskId, status=completed).
2. Camada `src/api/tasks.ts`.
3. Estados loading/erro/vazio; invalidar após concluir.

## Critérios de aceite
- [ ] Lista exibe tarefas reais.
- [ ] Marcar concluída persiste (reload).
- [ ] Estado vazio coerente.
