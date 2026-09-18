# T-2: Fotos de progresso + consentimento

**Status:** concluído
**Depende de:** T-1

> QA aprovado (qa/report-t-2.md — runtime 59/59) + review feito (7 achados: size-antes-buffer, allowlist raster anti-SVG, consentimento só true, chave R2 única, órfão R2, MIME vazio; 1 aceito).

## Objetivo
Fotos de progresso (frente/lado/costas) por avaliação, no R2, só após consentimento explícito.

## Passos
1. Prisma: `model AssessmentPhoto` — clinicId, assessmentId, studentId, pose (`FRONT|SIDE|BACK`), url, path, createdAt. Campo `photoConsentAt` no User.
2. Consentimento: etapa/toggle que grava `photoConsentAt` (com quem/quando). Sem consentimento → upload bloqueado (403).
3. API de upload (reusa padrão R2 do projeto) staff + aluno; leitura por avaliação. Tenant+aluno scoped.

## Arquivos afetados
- prisma/schema.prisma, app/api/admin/assessments/[id]/photos/**, lib de upload R2 existente, tests

## Critérios de aceite
- [x] Sem consentimento → upload 403; com consentimento → gate abre.
- [ ] Fotos isoladas por tenant/aluno (outro tenant/aluno → 404).
