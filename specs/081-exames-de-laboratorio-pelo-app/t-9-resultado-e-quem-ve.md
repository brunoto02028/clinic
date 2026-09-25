# T-9: Resultado — biomarcadores, PDF e quem pode ver

**Status:** pendente
**Depende de:** T-8

## Objetivo
O resultado chega estruturado, fica guardado com as faixas de referência, e só é visto por quem
deve ver.

## Contexto
`GET /api/test_registration/{id}/lab_results` devolve biomarcadores paginados com `value`,
`min_range`, `max_range`, `unit_type`, `status` e `out_of_range`; `download_pdf` devolve o
documento. `204 No Content` quer dizer "ainda não".

**Suposição a validar com o Bruno:** o paciente só vê depois que a clínica libera. A lista da LML é
"Non-Clinical/Pharmacy", o que sugere resultado sem comentário médico — e um valor fora da faixa
chegando sozinho na tela de alguém é o tipo de coisa que não dá para desfazer. A alternativa é
liberar na hora com aviso de não-diagnóstico; **muda esta tarefa inteira.**

## Passos
1. Buscar os valores quando `results_ready` virar verdadeiro; paginar até o fim.
2. Gravar `LabResultValue` por biomarcador, idempotente por (registro, biomarcador).
3. Guardar o PDF no nosso storage (R2), como os documentos do paciente — não deixar a URL assinada
   deles como único caminho.
4. Liberação: a clínica vê primeiro, escreve um comentário opcional, e libera
   (`releasedToPatientAt`, `releasedBy`, `AuditLog` com autor). Só aí o push sai.
5. A tela do paciente mostra valor, unidade, faixa e se está fora — sem diagnóstico, com a frase de
   que o exame não substitui consulta.
6. `out_of_range` destacado, mas **nunca** com linguagem de alarme.

## Arquivos afetados
- `lib/lml/results.ts` (novo)
- `app/api/labs/results/[id]/route.ts` (novo)
- `app/api/admin/labs/orders/[id]/release/route.ts` (novo)

## Critérios de aceite
- [ ] `204` não grava nada e não marca o pedido como pronto
- [ ] Buscar duas vezes não duplica biomarcador
- [ ] Paciente pedindo resultado **não liberado** → 403
- [ ] Paciente pedindo resultado de outro paciente → 404
- [ ] Staff de outra clínica → 404
- [ ] Liberação grava autor no `AuditLog` (e não `userEmail: ""`, que foi pendência da 080)
- [ ] PDF servido pelo nosso storage, com URL que expira
