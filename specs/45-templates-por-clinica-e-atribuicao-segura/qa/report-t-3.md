# QA — T-3: Atribuição semana a semana + idioma + aviso de duplicado (API)

**Resultado:** APROVADO
**Data:** 16/09/2026 · **Commit:** 725c840

## Produção
| Cenário | Esperado | Obtido |
|---|---|---|
| `visibleThroughWeek: 2`, paciente en-GB, sem `language` | só semanas iniciais 1–2 visíveis, em inglês | 8/58 visíveis (todos semana 1 — o ACL não tem item começando na semana 2), primeiro escondido na semana 3; `language: en-GB`, título "ACL Reconstruction — Post-Operative Rehabilitation" |
| Paciente logado (en) — `/api/patient/protocol` | 8 itens | `[8]` |
| Paciente logado — `/api/exercises` | só exercícios das semanas liberadas | 5 de 28 prescrições (exatamente os 5 exercícios dos itens visíveis) |
| Paciente logado — sino | só os liberados | "5 new exercises to start" (antes do ajuste da revisão seriam 28) |
| Liberar semana 3 (`bulkHidden`, 6 itens) | itens e exercícios da semana 3 aparecem | itens 8 → 14; exercícios 5 → 10, todos de itens visíveis |
| Mesmo template de novo, sem `onExisting` | 409 com a lista | 409 "This patient already has an active protocol from this template", `existing: [SENT_TO_PATIENT]` |
| `onExisting: "keep"` | dois ativos | 201; `[SENT, SENT]` |
| `onExisting: "archive"` | antigos arquivados, novo criado | 201, `archived: 2`; `[SENT, ARCHIVED, ARCHIVED]` |
| Paciente pt-BR, sem `language` e sem `visibleThroughWeek` | português, tudo visível (compatível) | `pt-BR`, "Reabilitação Pós-Operatória de Reconstrução do LCA", 1º item "Avaliação Inicial Pós-Operatória", 58/58 visíveis; paciente vê 58 itens e 28 exercícios |
| `visibleThroughWeek: 0` | 400 | 400 |

## Unit
`assign-route.test.ts`: validação (7 casos → 400), visibilidade (2 → semanas 3+ escondidas; ausente/null
→ tudo visível), idioma (preferido / pedido / fallback EN), 409, archive (por filtro, antes do
create), keep. `protocol-exercise-gating.test.ts`: escondido, visível em outro item/protocolo,
`releasedThroughWeek`, pacote não pago.

## Evidência
- `screenshots/prod-t3-01-paciente-semana1.png` — tela do paciente descartável (bloqueada pelo aceite
  de termos, esperado para conta nova; a checagem foi feita pelas APIs do próprio paciente logado).
