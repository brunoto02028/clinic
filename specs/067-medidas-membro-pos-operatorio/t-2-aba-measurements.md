# T-2: Aba "Measurements"

**Status:** concluído (QA aprovado — qa/report-t-2.md; code review feito)
**Depende de:** T-1

## Objetivo
Tela para lançar e acompanhar as medidas.

## Passos
1. Componente `LimbMeasurementsTab` (formulário + histórico + gráficos com `TrendChart`).
2. Aba na ficha do paciente (`!isPersonal`).
3. Diferença operada − não operada por ponto, em destaque.
4. Editar/excluir registro.

## Arquivos afetados
- components/admin/limb-measurements-tab.tsx
- app/admin/patients/[id]/page.tsx

## Critérios de aceite
- [x] Lançar medida com lado operado e ADM
- [x] Histórico mostra semana do protocolo e diferença entre coxas
- [x] Gráficos: coxa operada × não operada, flexão, extensão
- [x] Aba invisível para o personal; nada na área do paciente
