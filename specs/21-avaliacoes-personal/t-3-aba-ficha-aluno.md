# T-3: Aba "Assessments" na ficha do aluno (admin do personal)

**Status:** pendente
**Depende de:** T-1, T-2

## Objetivo
O personal registra e acompanha avaliações na ficha do aluno.

## Passos
1. Nova aba "Assessments" em `app/admin/patients/[id]/page.tsx`, gated por `isPersonal` (como Workouts).
2. Registrar avaliação: escolher método de %GC (Manual/BIA/Dobras), preencher peso/altura/medidas/dobras; ver %GC/IMC/massas/RCQ computados.
3. Histórico + tendências (peso, %GC, cintura) — barras/linhas leves (padrão do WorkoutProgress).
4. Fotos com consentimento (T-2).

## Arquivos afetados
- app/admin/patients/[id]/page.tsx, components/assessments/**

## Critérios de aceite
- [ ] Personal vê a aba; clínica não (regressão).
- [ ] Registrar → salva (201) e aparece no histórico; %GC computado bate.
