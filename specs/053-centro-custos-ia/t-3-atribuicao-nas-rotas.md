# T-3: Atribuição — contexto `usage` nas rotas

**Status:** pendente
**Depende de:** T-1 (inventário), T-2

## Objetivo
Cada evento sabe **de qual tenant e de qual usuário** veio, e de **qual funcionalidade**. A prioridade é tudo que o personal e os alunos dele alcançam, porque é isso que vai para a fatura.

## Contexto
- As rotas já resolvem o actor (`getActor`, `getSessionStaffActor`, `getMobileActor`), que dá `clinicId` + `userId` + papel.
- Chamada de aluno do personal: `clinicId` do aluno = tenant do personal. É isso que faz o uso do aluno "somar na conta do personal" sem regra extra.
- Crons / jobs de sistema: sem usuário, e o `clinicId` vem do registro processado, quando houver.

## Passos
1. **Prioridade 1** (personal + aluno, conforme o inventário da T-1): passar `usage: { clinicId, userId, feature }` em cada chamada.
   - Exemplos esperados: `workout.ai-generate`, `exercise.translate`, `quiz.ai-generate`, `patient.voice-transcribe` e o que mais o inventário apontar.
2. **Prioridade 2** (restante: clínica, marketing, SUPERADMIN): passar o contexto também. A BPR nunca é faturada, mas o painel mostra o gasto dela por funcionalidade.
3. Jobs/crons: `clinicId` do registro processado; `userId` nulo.
4. Teste de cobertura: um script que roda o grep das chamadas de IA e falha se algum arquivo do inventário marcado "prioridade 1" não passar `usage`. Entra no fluxo de review.

## Arquivos afetados
- Rotas e libs listadas no inventário da T-1 (prioridade 1 obrigatória; prioridade 2 no mesmo PR se couber, senão numa tarefa de acompanhamento).
- `scripts/check-ai-usage-attribution.cjs` (novo)

## Critérios de aceite
- [ ] `qa.trainer` gera um treino com IA (tenant QA Studio PT, com exercícios com vídeo) → evento com `clinicId` = QA Studio PT, `userId` = trainer, `feature: "workout.ai-generate"`.
- [ ] Uma funcionalidade de IA disparada por `qa.aluno` (a que o inventário apontar) → evento com `clinicId` = QA Studio PT e `userId` = aluno.
- [ ] Uma funcionalidade de IA da clínica A (`qa.admina`) → evento com `clinicId` = A.
- [ ] O script de cobertura passa: zero rotas de prioridade 1 sem `usage`.
- [ ] Nenhum evento de prioridade 1 aparece como "não atribuído" durante o QA.
