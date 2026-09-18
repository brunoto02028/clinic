# QA Report — T-1: Schema — ExerciseCompletionLog

**Data:** 2026-09-15
**Resultado geral:** ✅ aprovado

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | Model `ExerciseCompletionLog` existe com os campos e relações corretos | Schema | ✅ |
| 2 | Constraint única `[protocolItemId, patientId, completedDate]` rejeita duplicata | API (Prisma direto) | ✅ |
| 3 | `npx tsc --noEmit` limpo nos arquivos da atividade | Build | ✅ |

## Detalhes

### 1. Model no schema ✅
Conferido em `prisma/schema.prisma` (linhas 3894-3908): `id`, `protocolItemId` (FK →
`ProtocolItem`, `onDelete: Cascade`), `patientId` (FK → `User`, `onDelete: Cascade`),
`completedDate DateTime @db.Date`, `createdAt`. `@@unique([protocolItemId, patientId,
completedDate])` presente, com índices em `protocolItemId` e `patientId`. Relação inversa
`completionLogs ExerciseCompletionLog[]` confirmada em `ProtocolItem` (linha 3883).

### 2. Constraint única rejeita duplicata ✅
- **Script:** script Prisma local temporário (scratchpad, não versionado), rodado contra
  `bpr_clinic_local` com um `protocolItemId`/`patientId` reais do protocolo de teste.
- **Passos:** insere um log com `completedDate = 2026-09-01`; insere de novo com os mesmos três
  campos.
- **Obtido:**
  ```
  First insert OK: cmu2ntph50001xzuk37s9ng1k
  Second insert correctly REJECTED. Error code: P2002 | message:
  Cleaned up test row.
  ```
  Erro `P2002` (Prisma: unique constraint violation) na segunda gravação, como esperado.

### 3. `npx tsc --noEmit` ✅
Rodado no projeto inteiro. Existem ~30 erros de TypeScript pré-existentes, todos em arquivos
não tocados por esta atividade (ex.: `app/api/patient/documents/route.ts`,
`app/dashboard/body-assessments/page.tsx`, `lib/instagram.ts`, `prisma/seed-marketplace.ts`
etc. — problemas de tipagem antigos, sem relação com `ExerciseCompletionLog`). Filtrando a
saída para os arquivos da atividade 42 (`schema.prisma`, `patient/protocol/route.ts`,
`patients/[id]/protocol/route.ts`, `dashboard/treatment/page.tsx`,
`admin/patients/[id]/page.tsx`): **zero erros**.

## Erros de console
N/A (tarefa não envolve UI).

## Falhas e recomendações
Nenhuma. T-1 está correto e completo conforme os critérios de aceite do arquivo
`t-1-schema.md`.

## Ambiente de teste
- Banco: `bpr_clinic_local` (local, Postgres).
- Dados de teste criados (paciente QA + protocolo ACL Reconstruction template) foram
  removidos ao final da bateria de QA da atividade 42 (ver `report-t-4.md` para o resumo de
  limpeza).
