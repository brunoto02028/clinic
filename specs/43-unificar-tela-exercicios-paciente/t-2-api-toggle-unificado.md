# T-2: API — toggle diário unificado + GET com logs

**Status:** implementado — aguardando QA
**Depende de:** T-1

## Objetivo
Marcar/desmarcar "fiz hoje" numa prescrição solta funciona igual a um item de protocolo (mesmo
padrão de toggle por data), e tanto o GET do paciente quanto o do admin trazem o histórico.

## Contexto
Ver plan.md, decisões 1 e 2. Hoje `PATCH /api/exercises` só incrementa/decrementa
`completedCount` (sem data). Vira um toggle por data, igual `POST /api/patient/protocol`
(`action: "toggleLog"`) já faz pra itens de protocolo — reaproveitar a mesma lógica de
criar/deletar log e recalcular `completedCount`/`lastCompletedAt`/`isActive`-derivados a partir
dos logs reais (não incrementar às cegas).

## Passos
1. Em `app/api/exercises/route.ts`, `PATCH`: trocar o corpo aceito pra `{ prescriptionId, date? }`
   — default hoje em `Europe/London`. Confirma posse (`patientId === userId`, igual já faz). Se já
   existe log pra essa `exercisePrescriptionId`+`patientId`+`completedDate` → deleta; senão →
   cria. Depois do toggle, recalcula `completedCount` (nº de logs), `lastCompletedAt` (data do log
   mais recente ou null) e grava no `ExercisePrescription`, igual ao padrão já usado no
   `toggleLog` de `app/api/patient/protocol/route.ts`. Remover o `action: "undo"` antigo (o toggle
   já cobre desmarcar).
2. No `GET` da mesma rota, incluir por prescrição os `completionLogs` dos últimos 14 dias
   (`completedDate`), igual ao GET de `/api/patient/protocol`.
3. Em `app/api/admin/exercise-prescriptions/route.ts` (`GET`), incluir os mesmos
   `completionLogs` por prescrição, sem limite de 14 dias.

## Arquivos afetados
- `app/api/exercises/route.ts`
- `app/api/admin/exercise-prescriptions/route.ts`

## Critérios de aceite
- [ ] `toggleLog`-style `PATCH` marca na primeira chamada, desmarca na segunda (mesma data) —
      idempotente
- [ ] `PATCH` numa `prescriptionId` de outro paciente → erro (posse), não vaza
- [ ] `GET` do paciente retorna as datas certas por prescrição
- [ ] `GET` do admin retorna as datas certas por prescrição
- [ ] `npx tsc --noEmit` limpo
