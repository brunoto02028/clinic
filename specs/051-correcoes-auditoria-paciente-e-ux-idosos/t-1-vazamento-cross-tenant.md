# T-1: Corrigir vazamento cross-tenant em getExpectedToday

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
`getExpectedToday()` não deve mais incluir `ExercisePrescription`/`TreatmentProtocol` de uma
clínica diferente da do paciente.

## Contexto
`lib/patient-daily-adherence.ts:79-89` busca `ExercisePrescription` filtrando só por
`patientId`, sem `clinicId` — diferente de `/api/admin/exercise-prescriptions`, que escopa
corretamente. Resultado observado na auditoria: a aba Exercises de um paciente mostrava "0
exercises" (rota corretamente escopada) enquanto o painel de Adherence do mesmo paciente
mostrava uma pendência vinda de um `ExercisePrescription` de **outra clínica** (rota não
escopada, achando o registro "errado"). `ExercisePrescription.clinicId` é campo obrigatório
(`prisma/schema.prisma:2929`). A query de `TreatmentProtocol` (linha 35-54) tem o mesmo padrão
de risco (só `patientId`, sem `clinicId`) — corrigir os dois juntos.

## Passos
1. No início de `getExpectedToday(patientId, date)`, buscar `patient.clinicId`:
   ```ts
   const patient = await prisma.user.findUnique({ where: { id: patientId }, select: { clinicId: true } });
   if (!patient?.clinicId) return { expected: [], completed: [], allDone: false };
   ```
2. Adicionar `clinicId: patient.clinicId` ao `where` de `prisma.treatmentProtocol.findMany`
   (linha 36) e ao `where` de `prisma.exercisePrescription.findMany` (linha 80-87).
3. Conferir se `ExerciseCompletionLog`/outras queries mais abaixo na mesma função (que buscam
   registros "completed" a partir dos IDs já coletados) precisam do mesmo tratamento — só se
   também não escoparem por clínica.

## Arquivos afetados
- `lib/patient-daily-adherence.ts`

## Critérios de aceite
- [ ] Paciente com `ExercisePrescription`/`TreatmentProtocol` de outra clínica (dado de teste
      propositalmente "sujo") não aparece mais na lista de "expected" desse paciente.
- [ ] Paciente com dados normais (mesma clínica) continua funcionando exatamente igual —
      regressão coberta pelos 7 call sites de `getExpectedToday` (adherence-today, preview de
      e-mails, notificações, relatório da clínica).
- [ ] `npx tsc --noEmit` e `npx next lint` limpos.
