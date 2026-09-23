# T-7: Trocar o `SEND_MESSAGE` do `daily-adherence` por enfileirar

**Status:** em QA — correções do QA aplicadas
**Depende de:** T-4 aprovada no QA

## Objetivo

Fazer a primeira automação real deixar de enviar direto e passar a **enfileirar** — fechando o
critério de aceite da fase: *"uma regra agendada dispara, monta a mensagem, ela aparece na fila de
aprovação, o Bruno aprova, e ela é entregue uma única vez"*.

## Por que é tarefa separada

A T-4 entrega a fila, as guardas e a tela. Esta troca mexe num caminho **que está em produção** —
o lembrete diário que a ativ. 061 ligou por clínica. Não se troca isso confiando numa fila que
ainda não passou por QA. Separar deixa a T-4 ser reprovada sem arrastar junto o caminho antigo.

## A pergunta que precisa de resposta antes

Hoje o envio grava `AuditLog` com `REMINDER_ACTION`, e **duas coisas leem isso**:

- `app/api/admin/adherence/send-reminder` — o botão "Send now", para não mandar duas vezes no dia
- `app/api/admin/patients/[id]/adherence-today` — mostra ao staff se o lembrete do dia já saiu

Se o cron passa a enfileirar, o que significa "lembrete enviado hoje"? Enfileirado não é enviado.
A resposta tem que preservar a verdade das duas telas: provavelmente o `AuditLog` passa a ser
gravado **na entrega** (`deliverMessage`), não no enfileiramento — mas aí o `deliverMessage`
genérico precisa saber que ação registrar, e isso não pode virar `if (ruleCode === ...)` dentro de
uma função que serve todas as regras.

Uma saída: o `actionData` da regra carrega `auditAction`, e o `deliverMessage` grava quando existir.
Decidir na implementação, não antes.

## Passos

1. Responder a pergunta acima e registrar a decisão neste arquivo.
2. Na rota, trocar `notifyPatient(...)` por `enqueueMessage(...)`, montando o texto com
   `buildTodayReminderText(titles, templates.today)` — os mesmos builders, para o paciente ler
   exatamente o mesmo texto de hoje.
3. Assunto novo, em inglês canônico e português. ⚠️ O assunto atual é
   `BPR Rehab — Notification`; **"Rehab" não entra em texto novo** (ver a regra permanente do
   Bruno). Avisar sobre o uso antigo em vez de mudá-lo aqui.
4. Tirar o dedupe por `AuditLog` da rota — a chave de idempotência da fila já faz isso, por janela.
5. QA comparando o e-mail entregue pela fila com o `sha256` do e-mail de hoje
   (`2add20ef…d6d7565e`, registrado em `qa/report-t-3-recheck.md`).

## Arquivos afetados

- `app/api/cron/daily-adherence/route.ts`
- `lib/automation/outbox.ts` (se a decisão do `auditAction` exigir)
- `prisma/seed-automation-rules.ts`

## Critérios de aceite

- [ ] Com o lembrete ligado numa clínica de teste, o cron **não envia**: cria linha na fila
- [ ] O e-mail entregue depois da aprovação tem o **mesmo `sha256`** do que sai hoje
- [ ] "Lembrete enviado hoje" continua verdadeiro nas duas telas que leem `REMINDER_ACTION`
- [ ] Rodar o cron duas vezes no mesmo dia cria **uma** linha na fila
- [ ] Nenhum texto novo contém "Rehab"
