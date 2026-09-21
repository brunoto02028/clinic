# T-3: Vínculo com protocolo/semana

**Status:** concluído (QA aprovado — qa/report-t-3.md; code review feito)
**Depende de:** T-1, T-2

## Objetivo
A evolução das medidas aparece junto do protocolo semanal.

## Passos
1. Servidor grava `protocolId`/`protocolWeek` (feito em T-1).
2. Aba de protocolo: atalho "Measurements" com a última medida (semana, diferença de coxa, ADM).

## Arquivos afetados
- app/admin/patients/[id]/page.tsx (atalho na aba de protocolo)

## Critérios de aceite
- [x] Registro criado durante o protocolo guarda a semana correta
- [x] Atalho mostra a última medida e leva à aba
