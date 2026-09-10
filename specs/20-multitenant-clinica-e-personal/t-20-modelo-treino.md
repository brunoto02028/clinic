# T-20: Modelo e API de treino

**Status:** pendente
**Trilha:** PERSONAL
**Depende de:** T-12

## Objetivo
Criar a estrutura de treino de força que falta hoje (achados M1 e M2) sem tocar na prescrição clínica.

## Passos
1. Modelos novos, com migração aditiva:
   - `Workout`: tenant, personal, aluno, nome ("Treino A"), ordem, dias, semana/fase, observações, ativo.
   - `WorkoutExercise`: exercício da biblioteca (com vídeo), ordem, grupo de superset, séries, faixa de reps, carga (kg), RPE ou RIR, cadência, descanso, observações.
   - `WorkoutLog`: sessão realizada — data, duração, RPE da sessão, observações.
   - `WorkoutSetLog`: série realizada — reps, carga, RPE, concluída.
2. Novo módulo `TRAINING` no enum `ClinicModule`, ligado por padrão só no tenant personal.
3. API CRUD com `tenant-access` e validação de faixas (RPE 1–10, RIR 0–5, reps e carga ≥ 0).

## Critérios de aceite
- [ ] Cenários da T-20 passando.
- [ ] Nenhuma tabela existente alterada.
