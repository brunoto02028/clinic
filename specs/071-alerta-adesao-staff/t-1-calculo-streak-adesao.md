# T-1: Cálculo de streak de adesão

**Status:** concluído
**Depende de:** nenhuma

## Objetivo

Dado um paciente com um `TreatmentProtocol` `SENT_TO_PATIENT`, calcular há
quantos dias corridos não existe nenhuma linha nova em
`ExerciseCompletionLog`, considerando só o período em que havia pelo menos
um item `HOME_EXERCISE`/`HOME_CARE` liberado (mesma janela `startWeek`/
`endWeek` vs. `releasedThroughWeek` que `getExpectedToday` já usa — reaproveitar
essa lógica, não duplicar).

## Contexto

Sem tabela nova (ver `plan.md` — Decisões de design). A função vive ao lado
de `lib/patient-daily-adherence.ts` e `lib/clinic-daily-adherence.ts`,
seguindo o mesmo estilo (funções puras, testáveis, sem side effect).

## Passos

1. Criar `lib/patient-adherence-streak.ts` com
   `getDaysWithoutActivity(patientId: string, asOf: Date): Promise<number | null>`
   — `null` quando o paciente não tem nenhum item liberado esperando ação
   (não deve contar como "atrasado" quem não tem nada pra fazer).
2. Reaproveitar a mesma janela de liberação (`startWeek`/`endWeek`/
   `releasedThroughWeek`) já usada em `getExpectedToday` — extrair um helper
   comum se fizer sentido, em vez de copiar a lógica.
3. Criar `getClinicPatientsFallingBehind(clinicId: string, thresholdDays: number, asOf: Date)`
   em `lib/clinic-daily-adherence.ts` (ou arquivo novo ao lado) — roda o
   cálculo acima pra todo paciente `SENT_TO_PATIENT` da clínica e devolve só
   quem tem `daysWithoutActivity >= thresholdDays`.
4. Endpoint: `GET app/api/admin/adherence/falling-behind/route.ts` — mesmo
   padrão de auth do `adherence/today` (`SUPERADMIN/ADMIN/THERAPIST`, escopado
   por `sessionClinicId`), devolve a lista com paciente, dias sem atividade,
   e se há alguma `patientNotes` não vista (depende de T-4 pra ter dado real,
   mas o contrato do endpoint já inclui o campo).

## Arquivos afetados

- `lib/patient-adherence-streak.ts` (novo)
- `lib/clinic-daily-adherence.ts` (estende)
- `app/api/admin/adherence/falling-behind/route.ts` (novo)

## Critérios de aceite

- [ ] Paciente sem protocolo `SENT_TO_PATIENT` nunca aparece na lista.
- [ ] Paciente com protocolo ativo mas sem nenhum item liberado ainda (ex.:
      só semana 3 liberada, item começa semana 5) não conta como atrasado.
- [ ] Paciente que logou algo ontem não aparece hoje (streak reseta a cada log).
- [ ] Cálculo é escopado por `clinicId` — staff de uma clínica nunca vê
      paciente de outra na lista (mesma disciplina da atividade 071 anterior
      sobre isolamento — reforçar teste de tenant aqui também).
- [ ] `tsc --noEmit` e `eslint` limpos nos arquivos novos.
