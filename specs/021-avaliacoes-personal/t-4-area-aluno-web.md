# T-4: Área do aluno na web (/dashboard/assessments)

**Status:** concluído
**Depende de:** T-1, T-2

## Objetivo
O aluno vê suas avaliações, medidas, composição, fotos e evolução (web, paleta da marca).

## Passos
1. `/dashboard/assessments` (portal do aluno) → lista datada + detalhe + tendências + fotos.
2. Opcional: aluno registra o próprio peso entre sessões.

## Arquivos afetados
- app/dashboard/assessments/page.tsx, components/assessments/student-assessments.tsx

## Critérios de aceite
- [x] Aluno vê só as próprias; paciente de clínica → estado vazio (sem erro). (QA report-t-4.md 2/2; review 6 achados)
