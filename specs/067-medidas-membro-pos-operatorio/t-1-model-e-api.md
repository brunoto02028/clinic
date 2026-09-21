# T-1: Model + API

**Status:** concluído (QA aprovado — qa/report-t-1.md; code review feito)
**Depende de:** nenhuma

## Objetivo
Persistir medidas de coxa (2 lados × 2 pontos) e ADM do joelho operado, com lado operado e vínculo ao protocolo/semana.

## Passos
1. Model `PatientLimbMeasurement` + relações no `User`.
2. `GET|POST /api/admin/patients/[id]/measurements`.
3. `PATCH|DELETE /api/admin/patients/[id]/measurements/[measurementId]`.
4. Validação de faixas; ao menos um valor numérico; data não futura.

## Arquivos afetados
- prisma/schema.prisma
- lib/limb-measurements.ts (validação + semana do protocolo)
- app/api/admin/patients/[id]/measurements/route.ts
- app/api/admin/patients/[id]/measurements/[measurementId]/route.ts

## Critérios de aceite
- [x] POST válido grava e devolve semana do protocolo
- [x] Entradas inválidas → 400 com mensagem
- [x] Sem sessão → 401; paciente de outra clínica → 404
- [x] PATCH/DELETE só afetam registro do próprio paciente/clínica
