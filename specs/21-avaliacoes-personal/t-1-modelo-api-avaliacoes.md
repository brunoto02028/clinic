# T-1: Modelo + API de avaliações

**Status:** concluído
**Depende de:** nenhuma (usa lib/tenant-access, lib/workout-access da atividade 20)

> QA aprovado (qa/report-t-1.md — jest 14, runtime 54/54) + review feito (6 achados: PATCH merge, JP 7-pontos, validação BIA, dobra>0, guarda idade, 1 query). Deployável (backend).

## Objetivo
Persistir e servir as avaliações do aluno (antropometria, medidas, composição), com cálculo de %GC no servidor.

## Contexto
D1/D2/D3 do plano. Tenant+aluno scoped. Não toca no `BodyAssessment` clínico.

## Passos
1. Prisma (aditivo): `model StudentAssessment` — clinicId, studentId, trainerId, date, weightKg?, heightCm?, sex?, bfMethod (`MANUAL|BIA|SKINFOLD`), bodyFatPct?, restingHr?, systolic?, diastolic?, girths Json?, skinfolds Json?, bia Json?, notes?, createdAt/updatedAt. Índices por clinicId, studentId. Back-relations em Clinic/User (virtuais).
2. Campo `sex` (enum ou string) no `User` (aditivo, opcional) para dobras.
3. `lib/body-composition.ts` (puro): Jackson-Pollock 3/7 pontos → densidade; Siri → %GC; BMI; leanMass/fatMass; RCQ. Validação de faixas.
4. API staff `app/api/admin/assessments` (GET lista por studentId, POST cria) + `[id]` (GET/PATCH/DELETE), via `getActor`+`assertTrainingAccess`+`assertPatientAccess`; computa e persiste os derivados no POST/PATCH.
5. API aluno `app/api/workouts`-style: `GET /api/assessments` (próprias) e mobile `/api/mobile/assessments`.

## Arquivos afetados
- prisma/schema.prisma, lib/body-composition.ts, app/api/admin/assessments/**, app/api/assessments/**, app/api/mobile/assessments/**, __tests__/personal/body-composition.test.ts, tests/tenant-isolation/run.cjs

## Critérios de aceite
- [x] Cálculo de %GC (JP+Siri), BMI, RCQ, massas — testado (unidades).
- [x] Isolamento: staff só do tenant; aluno só as próprias; outro tenant → 404.
- [x] Nenhuma tabela existente alterada além do `sex` aditivo no User.
