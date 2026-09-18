# QA Report — T-4: Checagem de agenda e criação de consultas só no primeiro envio

**Data:** 2026-09-16
**Resultado geral:** ✅ aprovado
**Ambiente:** Produção, pacientes de teste `QA44 A…` (protocolo enviado, sem agenda) e `QA44 B…`
(protocolo enviado, agenda completa: início 21/09, seg+qui 10:00, 4 sessões). Consultas contadas
via `GET /api/admin/appointments` filtrado pelo paciente; tudo apagado ao final.

## Resumo
| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | Protocolo enviado, sem agenda: PATCH `title` + `status: SENT_TO_PATIENT` → 200, título salvo (antes: 400 "Agendamento incompleto") | ✅ |
| 2 | Protocolo enviado, agenda completa: PATCH `summary` + `status: SENT_TO_PATIENT` → 200, consultas 0 → 0 | ✅ |
| 3 | Rascunho com agenda → `SENT_TO_PATIENT` → 4 consultas criadas; salvar de novo com o mesmo status → continua 4 | ✅ |
| 4 | Rascunho sem agenda → `SENT_TO_PATIENT` → 400 com a mensagem de agenda incompleta, status continua DRAFT | ✅ |
| 5 | Arquivado sem agenda → `SENT_TO_PATIENT` → 200 (não exige agenda) | ✅ |
| 6 | Arquivado com agenda → `SENT_TO_PATIENT` → 200, consultas 4 → 4 | ✅ |
| 7 | UI: Edit → mudar título → Save num protocolo enviado sem agenda → 200; corpo enviado foi só `{"protocolId","title"}`; `sessionTime`/`totalSessions` continuaram null (antes o form gravava 09:00 / 12 / 60 min como se fossem reais) | ✅ |

## Observação
O e-mail "protocolo compartilhado" também passou a sair só no primeiro envio (antes saía a cada
"Save"). Os e-mails dos testes foram para endereços `@example.test`.

## Reverificação após o code review (build 12:02, 16/09)
- Protocolo enviado (com `sentToPatientAt`) com agenda completa → DRAFT → SENT_TO_PATIENT: 200 e
  **0** consultas criadas (antes recriava o bloco inteiro e reenviava o e-mail) ✅
- UI: protocolo sem horário salvo; Edit mostra 09:00; definir data + MON e salvar → corpo enviado
  inclui `"sessionTime":"09:00"` e o banco passou a ter 09:00 / `["MON"]` / 28/09 (antes o 09:00
  mantido não era enviado e o protocolo ficava sem horário) ✅
