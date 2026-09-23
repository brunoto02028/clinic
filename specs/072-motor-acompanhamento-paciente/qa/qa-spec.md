# QA — atividade 072 (motor de acompanhamento, Fase 0)

Cenários por tarefa. Toda tarefa que toca o schema tem, antes de qualquer outro cenário, o
**cenário zero**.

## Cenário zero (obrigatório em T-2, T-3, T-4, T-5)

| | |
|---|---|
| Tipo | API/infra |
| Passos | `npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script` |
| Esperado | O script não contém nenhum `DROP`. Só `CREATE TABLE` / `CREATE INDEX` / `ALTER TABLE ... ADD`. |
| Por quê | O deploy roda `prisma db push --accept-data-loss`. Um `DROP` aqui apaga dado de paciente em produção. |

## T-1 — Mapa documento × sistema

| # | Tipo | Cenário | Esperado |
|---|---|---|---|
| 1.1 | doc | Cada modelo do §4 do documento | Aparece no mapa com decisão explícita: existe / criar / não criar |
| 1.2 | doc | Cada regra nomeada em §5.3, §6.3, §7.3 | Aparece com situação e arquivo |
| 1.3 | doc | Conflitos de nome | Listados com a decisão de cada um |

## T-2 — Central de alertas

| # | Tipo | Cenário | Esperado |
|---|---|---|---|
| 2.1 | API | `GET /api/alerts` como terapeuta da clínica A | 200, só alertas da A |
| 2.2 | API | Mesmo, olhando alerta da clínica B por id | 404 ou 403, nunca o dado |
| 2.3 | API | `GET /api/alerts` como paciente | 403 |
| 2.4 | API | `GET /api/alerts` sem token | 401 |
| 2.5 | API | `createAlert()` duas vezes, mesma regra/paciente/janela | Um alerta só |
| 2.6 | UI | Clicar "Ciente" | Status muda, grava quem e quando, aparece na tela |
| 2.7 | UI | Clicar "Resolvido" | Idem, e sai da lista de abertos |
| 2.8 | UI | Ordenação | URGENT antes de HIGH antes de MEDIUM antes de LOW |
| 2.9 | API | Nenhum envio ao paciente nesta tarefa | Nenhuma linha em log de mensagem |

## T-3 — Regras em banco

| # | Tipo | Cenário | Esperado |
|---|---|---|---|
| 3.1 | API | `daily-adherence` com a regra seedada, dados fixos | Saída **idêntica** à de antes da migração |
| 3.2 | API | Mudar o limite na tabela, rodar de novo | Comportamento muda, sem deploy |
| 3.3 | API | `active: false` na clínica A | A não dispara; B continua disparando |
| 3.4 | unit | `evaluateCondition` | Teste por operador suportado, incluindo condição malformada |
| 3.5 | API | Aderência abaixo do limite | Cria `Alert` LOW, **não** manda mensagem |
| 3.6 | git | Diff da tarefa | Nenhuma das outras 12 rotas de cron foi tocada |

## T-4 — Fila de aprovação

| # | Tipo | Cenário | Esperado |
|---|---|---|---|
| 4.1 | unit | `enqueueMessage()` | Cria com `AWAITING_APPROVAL`; teste falha se o dispatcher for chamado |
| 4.2 | UI | Abrir a fila | Prévia em inglês e português, inglês primeiro, com logo BPR |
| 4.3 | UI | Aprovar | Entrega uma vez; `sentAt` e ator gravados |
| 4.4 | API | Aprovar a mesma mensagem de novo | Não entrega segunda vez |
| 4.5 | UI | Descartar | Não entrega; fica registrado com ator e horário |
| 4.6 | API | Aprovar dentro do horário de silêncio do paciente | Segura, não descarta; entrega quando sai da janela |
| 4.7 | API | Paciente já no teto diário | Segura |
| 4.8 | API | Fila da clínica A vista pela clínica B | Vazia |
| 4.9 | API | Sem consentimento ativo para o canal | Não entrega, e a fila diz por quê |

## T-5 — Idempotência

| # | Tipo | Cenário | Esperado |
|---|---|---|---|
| 5.1 | unit | `runOnce` duas vezes, mesma chave | Um efeito; a segunda devolve o resultado anterior |
| 5.2 | unit | Duas execuções concorrentes (`Promise.all`) | Um efeito só |
| 5.3 | unit | Janela diferente | Efeito novo |
| 5.4 | UI | Ficha do paciente | Histórico diz qual regra rodou, quando e com que dado |

## T-6 — Painel de regras

| # | Tipo | Cenário | Esperado |
|---|---|---|---|
| 6.1 | UI | Mudar limite pela tela | Comportamento muda sem deploy |
| 6.2 | UI | Desligar regra numa clínica | Outras clínicas seguem ligadas |
| 6.3 | UI | Editar template | Prévia atualiza; inglês primeiro |
| 6.4 | API | `condition` inválida | 400 com mensagem clara, nada salvo |
| 6.5 | API | Usuário sem permissão | 403, e a tela não aparece no menu |
| 6.6 | UI | Qualquer alteração | `AuditLog` com valor antes e depois |

## Dados de teste

Usar paciente **de teste** em domínio reservado (`@example.com`, `example.test`). **Nunca** logar
como paciente real nem semear dado nele. Duas clínicas são obrigatórias em 2.1, 2.2, 3.3, 4.8 e
6.2 — isolamento entre clínicas é o risco que já mordeu este projeto duas vezes.
