# T-1: Modelo `ClinicalEvidenceReport` + migration

**Status:** pendente
**Depende de:** nenhuma

## Objetivo
Criar o modelo Prisma que persiste o relatório de evidência por paciente/triagem, reusando o
enum de estados existente.

## Contexto
- Reusa `DiagnosisStatus` (`GENERATING→DRAFT→UNDER_REVIEW→APPROVED→SENT_TO_PATIENT`).
- Distinto do `AIDiagnosis` manual.

## Passos
1. Adicionar `model ClinicalEvidenceReport` em `prisma/schema.prisma`:
   - `id`, `clinicId`, `patientId`, `screeningId` (FK p/ `MedicalScreening`), `reviewedById?`
   - `status DiagnosisStatus @default(GENERATING)`, `language String @default("en-GB")`
   - `caseSummary Json?` (queixa, localização, duração, escores, achados — snapshot da triagem)
   - `redFlag Boolean @default(false)`, `redFlagDetails Json?`
   - `evidence Json?` (`[{ref, level, title, authors, journal, year, language, doi, url}]`)
   - `clinicCrossRef Json?` (`{available:[], offCatalog:[{item, sourceRef}]}`)
   - `suggestions Json?` (`{treatment:[...], exercise:[...]}` com `sourceRef` e disponibilidade)
   - `gaps Json?`
   - `narrativeEn String? @db.Text`, `narrativePt String? @db.Text`
   - `aiModel String?`, `promptTokens Int?`, `completionTokens Int?`, `error String?`
   - `approvedAt DateTime?`, `createdAt`, `updatedAt`
   - índices: `[patientId]`, `[clinicId]`, `[status]`, `[screeningId]`
2. Relations: `patient`, `clinic`, `reviewedBy?`, `screening`.
3. `prisma migrate dev` (banco local) + `prisma generate`.

## Arquivos afetados
- `prisma/schema.prisma`
- nova migration em `prisma/migrations/`

## Critérios de aceite
- [ ] `prisma migrate dev` aplica sem erro; `prisma generate` ok.
- [ ] Modelo compila e é acessível via `prisma.clinicalEvidenceReport`.
- [ ] Reusa `DiagnosisStatus` (não cria enum novo).
