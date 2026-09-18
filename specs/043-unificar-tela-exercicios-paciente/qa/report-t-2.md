# QA Report — T-2: API — toggle diário unificado + GET com logs

**Data:** 2026-09-16
**Resultado geral:** ✅ aprovado
**Ambiente:** Produção (https://bpr.clinic), build 2026-09-16T06:50:33.678Z

## Resumo
| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | `PATCH /api/exercises` numa prescrição sem log ainda → cria | ✅ |
| 2 | `PATCH` de novo, mesma prescrição/dia → desmarca | ✅ |
| 3 | `PATCH` numa `prescriptionId` de outro paciente → erro, nenhum log criado | ✅ |
| 4 | `GET /api/exercises` (paciente) retorna as datas certas por prescrição | ✅ |
| 5 | `GET /api/admin/exercise-prescriptions` retorna as mesmas datas | ✅ |

## Evidência
Paciente de teste descartável `QA43 SoltaB` (`cmu3q84tj0005qh08oio9cr3j`, deletada ao final),
com 10 prescrições soltas (pasta "Knee") e nenhum protocolo.

- Marcar segunda-feira (14/09) via `PATCH /api/exercises` `{prescriptionId, date:"2026-09-14"}` →
  `GET /api/exercises` confirmou `completionLogs: [{completedDate: "2026-09-14T00:00:00.000Z"}]`,
  `completedCount: 1`.
- `GET /api/admin/exercise-prescriptions?patientId=...` retornou a mesma data no mesmo item —
  confirmado também visualmente na aba Exercises do admin (ver report-t-5.md).
- Posse: `PATCH` com `prescriptionId` de outro paciente (id que não pertence ao efetivo usuário)
  retornou 404 "Prescription not found", sem gravar log — verificado via curl de outro contexto.
- Toggle idempotente confirmado: mesma data, duas chamadas, cria depois remove.
