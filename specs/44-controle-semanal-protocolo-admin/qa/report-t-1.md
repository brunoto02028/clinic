# QA Report — T-1: API — ligar exercício ao item + liberar/esconder semana em lote

**Data:** 2026-09-16
**Resultado geral:** ✅ aprovado
**Ambiente:** Produção (https://bpr.clinic), commit 85230af (confirmado pelo próprio código: um
`bulkHidden` vazio devolveu a mensagem nova "bulkHidden needs itemIds (1-200 ids)…").
Sessão SUPERADMIN. Pacientes de teste descartáveis `QA44 A…` / `QA44 B…` (template ACL
atribuído a cada), apagados ao final junto com as consultas geradas.

## Resumo
| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | `itemUpdate.exerciseId` = exercício da clínica → 200; GET traz `item.exercise` | ✅ |
| 2 | Paciente (impersonada) recebe `exercise.videoUrl` no item ligado | ✅ |
| 3 | `exerciseId: null` → 200, `item.exercise` vira null | ✅ |
| 4 | `exerciseId` inexistente + `title` no mesmo update → 400 "Exercise not found in this clinic", título não mudou | ✅ |
| 5 | `newItem` com `exerciseId` inexistente → 400, contagem de itens igual (58 → 58) | ✅ |
| 6 | `bulkHidden` (50 ids das semanas ≥ 3, `hidden: true`) → 200, `count: 50`; paciente passa a receber 8 itens | ✅ |
| 7 | `bulkHidden` no protocolo de A com um id de item do paciente B → `count: 1`; item de B continua visível | ✅ |
| 8 | `bulkHidden` com `protocolId` de B pela URL do paciente A → 404 | ✅ |
| 9 | `bulkHidden` sem `itemIds` / `hidden: "yes"` / `itemIds: [123]` / `itemIds: []` → 400 | ✅ |

Exercício de outra clínica: não há exercícios de outra clínica em produção pra testar; o mesmo
caminho de rejeição (`clinicId` diferente ou inexistente) foi exercitado com id inexistente.

## Observação
Os 400/404 no console do navegador durante o QA são dessas chamadas negativas, intencionais.
