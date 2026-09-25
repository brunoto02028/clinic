# QA — atividade 081 (exames de laboratório pelo app)

> As tarefas foram reordenadas em 25/09 (as que não precisam do token da LML vieram primeiro).
> Os **ids dos cenários** mantêm a numeração original para os relatórios já escritos continuarem válidos;
> o título de cada bloco diz a tarefa atual.

Tudo contra a **sandbox da LML**, que resulta sozinho em 1–2 minutos e aceita `foreign_id` mágico
(`test:abnormal_high:<ref>`) para forçar cenário. Nenhuma chamada à API de produção deles, nenhum
kit físico, nenhuma cobrança real no Stripe (chave de teste, eventos assinados com HMAC local).

Paciente de teste identificado, nunca paciente real. Zero DDL no banco compartilhado.

---

## T-5 · Cliente e catálogo *(cenários 1.x — ids mantidos da numeração original)*

| # | tipo | cenário | esperado |
|---|---|---|---|
| 1.1 | API | `POST /api/admin/labs/sync` sem `LML_API_KEY` | 503, mensagem de não configurado, nada gravado |
| 1.2 | API | sync com token da sandbox | 2xx, `LabProduct` criados, só amostra capilar |
| 1.3 | API | sync duas vezes seguidas | mesma contagem, zero duplicata |
| 1.4 | API | mudar `retailPrice` no banco → sync | `retailPrice` **intacto**, `costPrice` atualizado |
| 1.5 | API | desativar produto no painel → sync | `isActive` continua falso |
| 1.6 | API | produto removido do catálogo deles | vira `isActive: false`, linha preservada |
| 1.7 | API | produto sem RRP na resposta | nasce com `retailPrice = costPrice` e **inativo** |
| 1.8 | API | sync chamado por paciente / staff de outra clínica | 403 |
| 1.9 | API | LML respondendo 500 | erro tratado, nada gravado pela metade |

## T-1 · Modelo *(cenários 2.x)*

| # | tipo | cenário | esperado |
|---|---|---|---|
| 2.1 | API | `prisma migrate diff` contra `main` | zero `DROP` |
| 2.2 | API | ler `LabOrder` antigo sem `clinicId` | não quebra |
| 2.3 | API | teste que lê o enum do `schema.prisma` | os sete estados batem com os que o código usa |

## T-6 · Carrinho e pagamento *(cenários 3.x)*

| # | tipo | cenário | esperado |
|---|---|---|---|
| 3.1 | API | pedido com `productId` válido | criado `BASKET`, total somado no servidor |
| 3.2 | API | corpo com `"price": 0.30` | ignorado; gravado o `retailPrice` do produto |
| 3.3 | API | conferir `unitCost` gravado | igual ao `costPrice` do produto naquele instante |
| 3.4 | API | mudar preço do produto e reler o pedido | pedido **não** muda |
| 3.5 | API | sem CEP | 400, EN e PT |
| 3.6 | API | produto inativo | 400 |
| 3.7 | API | quantidade 0 ou negativa | 400 |
| 3.8 | API | webhook do Stripe, assinatura inválida | 400 |
| 3.9 | API | webhook válido | `BASKET` → `CONFIRMED`, `paidAt`, um `LabOrderEvent` |
| 3.10 | API | mesmo webhook duas vezes | idempotente: um evento, um pagamento |
| 3.11 | API | paciente da clínica B lendo pedido da A | 404 |
| 3.12 | API | webhook com `labOrderId` da clínica A e paciente da B | recusado |

## T-7 · Pedido na LML e registro do kit *(cenários 4.x)*

| # | tipo | cenário | esperado |
|---|---|---|---|
| 4.1 | API | pagamento confirmado | Patient + Order + Test Registration criados na sandbox |
| 4.2 | API | webhook do Stripe entregue duas vezes | **um** pedido na LML (idempotência por `foreignId`) |
| 4.3 | API | LML fora do ar no momento do pagamento | pedido fica `CONFIRMED` + evento de erro; reprocessa |
| 4.4 | API | registrar kit com código e telefone | estado `awaiting_patient` → `pending` |
| 4.5 | API | registrar kit de pedido de outro paciente | 404 |
| 4.6 | API | registrar kit duas vezes | segunda vez não quebra nem duplica |
| 4.7 | API | TRF e etiqueta | baixam quando existem; 404 antes disso |

## T-8 · Webhooks *(cenários 5.x)*

| # | tipo | cenário | esperado |
|---|---|---|---|
| 5.1 | API | `X-Webhook-Secret` ausente | 401, nada gravado |
| 5.2 | API | segredo errado | 401, nada gravado |
| 5.3 | API | segredo certo, `order.shipped` | 200, `KIT_DISPATCHED`, evento gravado |
| 5.4 | API | `sample.received` | 200, `SAMPLE_RECEIVED` |
| 5.5 | API | `results.ready` | 200, `RESULTS_READY`, clínica notificada |
| 5.6 | API | evento desconhecido | **200**, registrado, estado intacto |
| 5.7 | API | mesmo evento duas vezes | um só efeito |
| 5.8 | API | evento antigo depois de um novo | pedido **não** retrocede |
| 5.9 | API | conteúdo dos push disparados | nenhum cita exame ou valor |

## T-9 · Resultado *(cenários 6.x; 6.5–6.8 e 6.10 já valem para a T-2, que entrega a liberação)*

| # | tipo | cenário | esperado |
|---|---|---|---|
| 6.1 | API | buscar resultado com `204` | nada gravado, pedido não marcado pronto |
| 6.2 | API | resultado pronto na sandbox | `LabResultValue` por biomarcador, com faixa |
| 6.3 | API | buscar duas vezes | sem duplicata |
| 6.4 | API | `foreign_id` mágico `abnormal_high` | `outOfRange: true` no biomarcador esperado |
| 6.5 | API | paciente pedindo resultado não liberado | 200 com `result: null` e `stage: in_review` — sem valores, sem nota, nada que sugira o número (decisão da T-3: a tela diz "em revisão", não recusa) |
| 6.6 | API | paciente pedindo resultado de outro | 404 |
| 6.7 | API | staff de outra clínica | 404 |
| 6.8 | API | liberação pela clínica | `releasedToPatientAt`, `releasedBy`, `AuditLog` com e-mail real do autor |
| 6.9 | API | PDF | servido pelo nosso storage, URL expira |
| 6.10 | UI | tela do resultado | valor, unidade, faixa, fora-da-faixa destacado sem alarme, frase de não-diagnóstico |

## T-3 · App *(cenários 7.x)*

| # | tipo | cenário | esperado |
|---|---|---|---|
| 7.1 | API | JSON do catálogo do app | **nenhum** campo de custo |
| 7.2 | UI | catálogo | nome, o que mede, prazo, preço de venda |
| 7.3 | UI | detalhe | biomarcadores, amostra capilar, texto de picada no dedo |
| 7.4 | UI | checkout sem CEP | erro na tela, EN e PT |
| 7.5 | UI | cada estado do pedido | texto próprio, EN e PT |
| 7.6 | UI | resultado não liberado | não aparece de forma nenhuma |
| 7.7 | UI | PDF | abre dentro do app |
| 7.8 | API | `tsc` no `mobile/` | limpo |

## T-2 · Painel *(cenários 8.x)*

| # | tipo | cenário | esperado |
|---|---|---|---|
| 8.1 | UI | editar preço de venda | app reflete sem deploy |
| 8.2 | UI | preço abaixo do custo | exige confirmação; grava `AuditLog` |
| 8.3 | UI | margem no pedido | a congelada na venda, não a recalculada |
| 8.4 | UI | lista de pedidos | paciente, exame, estado, custo, venda, margem |
| 8.5 | API | admin da clínica A lendo pedidos da B | vazio / 404 |
| 8.6 | API | paciente em `/api/admin/labs/*` | 403 |

## T-4 · Privacidade e consentimento *(cenários 9.x)*

| # | tipo | cenário | esperado |
|---|---|---|---|
| 9.1 | API | pedido sem consentimento | 403 com `code`, EN e PT |
| 9.2 | API | aceitar consentimento | `ConsentLog` com versão e data |
| 9.3 | UI | `/privacy` | nomeia a LML e diz o que vai para lá |
| 9.4 | UI | tela de resultado e e-mail | frase de não-diagnóstico presente |
| 9.5 | API | `eas.json` | mudança do `SHOW_LAB` documentada como exigindo build novo |

---

## Cenários que atravessam tarefas

| # | cenário | esperado |
|---|---|---|
| X.1 | ciclo completo na sandbox: comprar → pagar → pedido na LML → registrar kit → amostra → resultado → liberar → paciente vê | cada estado na ordem, sem pulo, com evento gravado em cada passo |
| X.2 | o mesmo com `abnormal_high` | biomarcador fora da faixa, destacado sem alarme |
| X.3 | o mesmo com `fail` / `processing_error` | pedido não fica preso em "processando" para sempre; a clínica vê o erro |
| X.4 | dois pacientes de clínicas diferentes comprando o mesmo exame | nenhum vê o pedido nem o resultado do outro, em nenhuma rota |
| X.5 | preço mudado entre a compra e o resultado | o pedido continua com custo, venda e margem do dia da compra |

## O que não será medido, e por quê

| item | motivo |
|---|---|
| kit físico e correio | não há kit na sandbox |
| cobrança real no Stripe | proibido; só recusas e eventos assinados localmente |
| produção da LML | não teremos token de produção nesta atividade |
| prazo real de laboratório | a sandbox resulta em 1–2 minutos, não no prazo real |
