# T-2: Fotos de progresso + consentimento

**Status:** pendente
**Depende de:** T-1

## Objetivo
Fotos de progresso (frente/lado/costas) por avaliação, no R2, só após consentimento explícito.

## Passos
1. Prisma: `model AssessmentPhoto` — clinicId, assessmentId, studentId, pose (`FRONT|SIDE|BACK`), url, path, createdAt. Campo `photoConsentAt` no User.
2. Consentimento: etapa/toggle que grava `photoConsentAt` (com quem/quando). Sem consentimento → upload bloqueado (403).
3. API de upload (reusa padrão R2 do projeto) staff + aluno; leitura por avaliação. Tenant+aluno scoped.

## Arquivos afetados
- prisma/schema.prisma, app/api/admin/assessments/[id]/photos/**, lib de upload R2 existente, tests

## Critérios de aceite
- [ ] Sem consentimento → upload 403; com consentimento → 201.
- [ ] Fotos isoladas por tenant/aluno (outro tenant/aluno → 404).
