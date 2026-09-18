# QA Report — T-5: UI — protocolos arquivados recolhidos

**Data:** 2026-09-16
**Resultado geral:** ✅ aprovado
**Ambiente:** Produção, paciente de teste `QA44 A…` com um protocolo ativo e um segundo protocolo
("QA44 archived copy", atribuído e depois arquivado).

## Resumo
| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | Protocolo ativo aparece primeiro, igual a antes; o arquivado não aparece na lista ativa | ✅ |
| 2 | Seção "Archived (1)" recolhida por padrão; título do arquivado só aparece após expandir | ✅ |
| 3 | Card expandido: selo "Archived", título, "58 items · created 16 Sept 2026", resumo, botão "Restore"; nenhum botão de liberar/editar itens | ✅ |
| 4 | "Restore" → confirmação "Restore "QA44 archived copy"? The patient will see it again."; cancelar → continua ARCHIVED | ✅ |
| 5 | Confirmar → status SENT_TO_PATIENT (tinha `sentToPatientAt`), sai da seção de arquivados e vai pra lista ativa; 0 consultas criadas | ✅ |

## Evidências
Verificado por DOM (textos do card, contagem de botões dentro dele, `elementFromPoint` sobre o
botão "Archived (1)" confirmando que não há sobreposição) e pela API (status antes/depois). Os
prints desta fase saíram congelados pela aba automatizada (ver nota em report-t-2.md).

## Não testado
Restore de um protocolo arquivado que nunca foi enviado (vai pra DRAFT) — caminho simples no
código (`sentToPatientAt` ausente), sem dado de teste nesse estado.
