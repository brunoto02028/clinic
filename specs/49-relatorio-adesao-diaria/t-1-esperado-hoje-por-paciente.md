# T-1: Função server-side "o que é esperado hoje" por paciente

**Status:** pendente
**Depende de:** nenhuma

## Objetivo
Uma função só, chamável do servidor, que devolve os itens esperados hoje de um paciente e quais já
foram completados — a mesma regra do "Today" card do paciente (`app/dashboard/treatment/page.tsx`),
extraída para reaproveitar no relatório (T-2) sem duplicar a lógica de filtro por semana.

## Contexto
Ver decisão 4 e suposições 5/6 do plano. A regra de "semana atual" já existe como `currentWeekOf`
(mesmo arquivo) — parte de `TreatmentProtocol.startDate`, não da data de cirurgia (ver comentário
existente no código, caso Ana Livia).

## Passos
1. Criar `lib/patient-daily-adherence.ts`, exportando
   `getExpectedToday(patientId: string, date: Date): Promise<{ expected: ExpectedItem[]; completed: ExpectedItem[]; allDone: boolean }>`.
2. Buscar protocolos ativos do paciente + itens (`itemType` in `HOME_EXERCISE`/`HOME_CARE`,
   `hiddenFromPatient: false`, semana atual dentro de `startWeek`/`endWeek`) e prescrições avulsas
   ativas (`ExercisePrescription.isActive`), mesma regra de `todayProtocolTasks`/
   `todayPrescriptionTasks`.
3. Buscar `ExerciseCompletionLog` do paciente com `completedDate` = `date` (normalizado para meia-noite
   no fuso da clínica, ver T-2/suposição 1) e cruzar com os itens esperados.
4. `allDone = expected.length > 0 && completed.length === expected.length`; paciente com
   `expected.length === 0` não entra em nenhuma lista (suposição 5 do plano).

## Arquivos afetados
- `lib/patient-daily-adherence.ts` (novo)

## Critérios de aceite
- [ ] Paciente com todos os itens de hoje completados → `allDone: true`.
- [ ] Paciente com 1+ item pendente → `allDone: false`, lista os itens pendentes.
- [ ] Paciente sem nenhum item esperado hoje → `expected: []`, não gera `allDone` nem `true` nem
      `false` utilizável pelo relatório (T-2 filtra fora).
- [ ] Bate com o que a página `/dashboard/treatment` mostra pro mesmo paciente no mesmo dia (conferir
      manualmente com a Ana Livia no QA).
