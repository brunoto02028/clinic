# T-2: API — toggle diário + incluir logs no GET

**Status:** concluído
**Depende de:** T-1

## Objetivo
Paciente consegue marcar/desmarcar "fiz hoje" num item, e tanto a tela do paciente quanto a
do admin conseguem ler o histórico de dias marcados por item.

## Contexto
Ver plan.md, decisão 2. Reaproveita `app/api/patient/protocol/route.ts` (paciente) e
`app/api/admin/patients/[id]/protocol/route.ts` (admin, só leitura do histórico).

## Passos
1. Em `app/api/patient/protocol/route.ts`, `POST`: novo `action: "toggleLog"` — body
   `{ itemId, date? }` (default: hoje em `Europe/London`, truncado pra meia-noite UTC do dia).
   Confirma que `itemId` pertence a um protocolo da própria paciente (mesma checagem de posse
   já usada nos outros actions dessa rota). Se já existe log pra esse `protocolItemId` +
   `patientId` + `completedDate` → deleta (desmarca). Se não existe → cria.
2. No `GET` dessa rota (protocolo do paciente), incluir por item os `completionLogs` dos
   últimos 14 dias (`completedDate` como array de datas ISO, já basta pro front montar a tira
   de 7 dias).
3. No `GET` de `app/api/admin/patients/[id]/protocol/route.ts`, incluir os mesmos
   `completionLogs` por item (sem limite de 14 dias — admin pode querer ver tudo).

## Arquivos afetados
- `app/api/patient/protocol/route.ts`
- `app/api/admin/patients/[id]/protocol/route.ts`

## Critérios de aceite
- [ ] `toggleLog` marca na primeira chamada, desmarca na segunda (mesma data) — idempotente
- [ ] `toggleLog` num `itemId` de outro paciente → erro (posse), não vaza
- [ ] `GET` do paciente retorna as datas certas por item
- [ ] `GET` do admin retorna as datas certas por item
- [ ] `npx tsc --noEmit` limpo
