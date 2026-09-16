# QA — T-2: Atribuição segura

**Resultado:** APROVADO
**Data:** 16/09/2026 · **Commit:** 725c840

## Unit (`__tests__/protocol/assign-route.test.ts`)
- Paciente fora da clínica (guarda devolve 404) → nada criado, nenhuma notificação.
- Template fora da clínica → 404 "Template not found", `templateInTenant` chamado com a clínica do ator.
- Protocolo e prescrições criados com `clinicId` da clínica de quem chama.
- Exercícios: próprio → mantido; de outra clínica com equivalente por nome → trocado pelo da
  clínica; sem equivalente → `null` e contado em `unlinkedExercises`.
- `mapExercisesToClinic` (`protocol-template-access.test.ts`): nome sem diferenciar maiúsculas,
  o mais antigo vence, nunca devolve id de outra clínica.

## Produção
Pacientes descartáveis `qa.ativ45.en@example.test` e `qa.ativ45.pt@example.test` (BPR), apagados ao final.

| Cenário | Esperado | Obtido |
|---|---|---|
| Active Clinic = "Bruno" → assign do ACL ao paciente da BPR | 404, nada criado | 404 "Patient not found"; paciente com 0 protocolos |
| Assign normal (BPR → paciente BPR) | 201, 41 itens ligados, `unlinkedExercises: 0` | 201, `prescriptions: 28` (exercícios distintos), `unlinkedExercises: 0`, 41 itens ligados, `clinicId` BPR |

## Local
Template ACL local ligado a exercícios de outra clínica local → toast "41 item(s) have no exercise
from this clinic's library linked", protocolo com 0 vínculos e 0 prescrições (nenhum exercício de
outra clínica foi ligado).
