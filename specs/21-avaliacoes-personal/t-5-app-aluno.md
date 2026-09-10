# T-5: Módulo Avaliações no app do aluno

**Status:** pendente
**Depende de:** T-1, T-2

## Objetivo
Mesma experiência da T-4 no app (`mobile/`).

## Passos
1. `/api/mobile/assessments` (Bearer) — já previsto na T-1.
2. Grupo `(avaliacoes)` no app: lista, detalhe, tendências, fotos; wiring no module-select (aparece só p/ personal).

## Arquivos afetados
- mobile/app/(app)/(avaliacoes)/**, mobile/src/api/assessments.ts, module-select

## Critérios de aceite
- [ ] Backend Bearer verificado (runtime). Telas: código + tsc; QA expo-web/EAS com o Bruno.
