# T-2: QA runtime com segundo tenant

**Status:** concluído
**Depende de:** T-1

## Objetivo
Provar em execução os achados de isolamento do T-1 e percorrer os fluxos do personal e do aluno.

## Contexto
Fixtures no banco local: tenant B "QA Studio PT" (`qa.trainer@example.test` ADMIN, `qa.aluno@example.test` PATIENT, 1 exercício + prescrição) e registros descartáveis no tenant A (`qa.pacientea@example.test`, `qa.fisioa@example.test`).

## Critérios de aceite
- [x] `qa/report-t-2.md` com evidência (status HTTP, corpo resumido, screenshots) de cada cenário da `qa-spec.md`.
- [x] Limpeza dos fixtures após o QA.
