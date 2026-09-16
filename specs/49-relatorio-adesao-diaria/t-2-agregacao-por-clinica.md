# T-2: Agregação de adesão diária por clínica

**Status:** pendente
**Depende de:** T-1

## Objetivo
Rodar `getExpectedToday` (T-1) para todo paciente com protocolo ativo de uma clínica e devolver um
resumo do dia: quem completou tudo, quem não completou (e o que faltou).

## Contexto
Ver suposição 1 (fuso horário) do plano. A data "hoje" é calculada no fuso da clínica
(`Clinic.timezone`), não em UTC — importante porque o cron roda num horário fixo do servidor.

## Passos
1. Criar `lib/clinic-daily-adherence.ts`, exportando
   `getClinicDailyAdherence(clinicId: string, date: Date): Promise<{ completed: PatientSummary[]; missing: PatientSummary[] }>`.
2. Listar pacientes com `TreatmentProtocol.status` ativo na clínica.
3. Rodar `getExpectedToday` para cada um (em paralelo), filtrar fora quem tem `expected: []`.
4. Particionar em `completed` (allDone) e `missing` (com a lista dos itens que faltaram, pro texto do
   lembrete/relatório).

## Arquivos afetados
- `lib/clinic-daily-adherence.ts` (novo)

## Critérios de aceite
- [ ] Resumo da clínica BPR bate com a conferência manual de 2-3 pacientes reais (Ana Livia entre
      eles).
- [ ] Pacientes de outra clínica nunca aparecem no resumo de uma clínica diferente.
