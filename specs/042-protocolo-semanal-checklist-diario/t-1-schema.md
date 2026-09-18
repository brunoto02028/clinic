# T-1: Schema — ExerciseCompletionLog

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Guardar, com data, cada dia em que a paciente marcou um item do protocolo como feito.

## Contexto
Ver plan.md, decisão 1.

## Passos
1. Adicionar `model ExerciseCompletionLog` em `prisma/schema.prisma`:
   `id`, `protocolItemId` (FK → `ProtocolItem`, `onDelete: Cascade`), `patientId` (FK → `User`),
   `completedDate DateTime @db.Date`, `createdAt DateTime @default(now())`.
   `@@unique([protocolItemId, patientId, completedDate])`, índices em `protocolItemId` e
   `patientId`.
2. Adicionar a relação inversa em `ProtocolItem` (`completionLogs ExerciseCompletionLog[]`).
3. `npx prisma generate` + `npx prisma db push` local (parar o dev server antes, mesmo
   procedimento de sempre).

## Arquivos afetados
- `prisma/schema.prisma`

## Critérios de aceite
- [ ] `npx tsc --noEmit` limpo
- [ ] Local: criar um log de teste (mesmo `protocolItemId`+`patientId`+`completedDate` duas
      vezes) e confirmar que a constraint única rejeita a duplicata
