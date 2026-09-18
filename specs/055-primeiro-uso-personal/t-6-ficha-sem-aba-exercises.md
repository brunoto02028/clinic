# T-6: Ficha do aluno sem a aba "Exercises" para o personal

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Para o personal, a ficha do aluno mostra só "Workouts" para passar exercício.

## Contexto
Decisão 4 do Bruno.

## Passos
1. Esconder a aba "Exercises" em `components/patients/patient-detail.tsx` quando o tenant é personal.

## Arquivos afetados
- `components/patients/patient-detail.tsx`

## Critérios de aceite
- [ ] Trainer: ficha sem "Exercises"; "Workouts" funciona.
- [ ] Clínica: aba continua.
