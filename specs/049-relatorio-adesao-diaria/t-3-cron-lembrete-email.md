# T-3: Cron `daily-adherence` — lembrete ao paciente + e-mail ao Bruno

**Status:** concluído
**Depende de:** T-2

## Objetivo
`POST /api/cron/daily-adherence?key=CRON_SECRET`, chamado uma vez por dia (suposições 2/3 do plano):
manda lembrete para cada paciente da lista `missing` (T-2) e um e-mail-resumo pro Bruno.

## Contexto
Mesmo padrão de autenticação dos outros crons (`app/api/cron/exercise-reminders/route.ts`):
`req.nextUrl.searchParams.get("key")` comparado a `CRON_SECRET`.

## Passos
1. Criar `app/api/cron/daily-adherence/route.ts`, `POST`, mesma checagem de `key`.
2. Para cada clínica ativa: `getClinicDailyAdherence` (T-2).
3. Para cada paciente em `missing`: `notifyPatient({ patientId, plainMessage: "...", plainMessagePt: "...", emailTemplateSlug: ... })` — texto simples, sem listar cada exercício (mensagem curta, ex. "Ainda faltam X atividades de hoje no seu plano").
4. Montar o e-mail-resumo (`sendEmail`, novo template inline ou em `lib/email-templates.ts`): lista de
   quem completou e quem não completou (com o que faltou), por clínica. Destino: `admin@bpr.clinic`
   (conta "Bruno Admin", decisão 6 do plano).
5. Registrar o envio do dia em algum lugar (ex. reaproveitar `AuditLog` com `action:
   "DAILY_ADHERENCE_SENT"` e `entityId` = data) — critério de aceite #4 depende disso pra não
   duplicar lembrete se o cron rodar 2x no mesmo dia.
6. Cadastrar o agendamento via API do Coolify (`POST /api/v1/applications/{uuid}/scheduled-tasks` —
   endpoint confirmado existente e vazio para o app `clinic`), rodando um comando dentro do
   container (`curl` no próprio endpoint deste cron) às 21h no fuso da clínica. Conferir se o
   agendador do Coolify roda no fuso do servidor ou aceita fuso explícito, e ajustar a expressão cron
   (e o horário de verão de Londres) de acordo — ver decisão 7 do plano.

## Arquivos afetados
- `app/api/cron/daily-adherence/route.ts` (novo)
- Configuração do Coolify (fora do repositório, via API)

## Agendamento no Coolify (feito em 16/09/2026)
Scheduled task `daily-adherence` criada via API (`POST /api/v1/applications/o9plir7dhgskyng8athrp1ec/scheduled-tasks`),
uuid `kudbnaznqbvkdbaxxdbidsq5`, **desativada** (`enabled:false`) até o deploy + QA desta tarefa
passarem — ativo só depois, pra não disparar contra uma rota ainda não publicada.

- `command`: `curl -s -X POST "http://localhost:3000/api/cron/daily-adherence?key=$NEXTAUTH_SECRET"`
  — roda dentro do próprio container (`container: "clinic"`), lê o segredo da variável de ambiente já
  existente no container (nunca aparece em texto puro em lugar nenhum desta conversa nem do payload).
- `frequency`: `0 20 * * *` — **UTC**, não fuso da clínica. Hoje (16/09/2026) Londres está em BST
  (UTC+1), então 20:00 UTC = 21:00 local, batendo com a decisão 2 do plano. **Vai desalinhar 1h
  quando o horário de verão terminar** (final de outubro/2026) — não confirmei se o agendador do
  Coolify aceita fuso IANA direto na expressão; até lá, ajustar manualmente pra `0 21 * * *` na volta
  ao horário de inverno, ou resolver isso de vez numa iteração futura.

## Nota (16/09/2026)
Adicionado `?force=true` (mesma checagem de `key`) — reenvia o relatório do dia mesmo já tendo sido
enviado, sem nunca duplicar o lembrete ao paciente. Serve tanto pra recuperar uma execução perdida
quanto pra testar mudanças no template sem esperar o próximo dia (usado no QA desta atividade).

## Critérios de aceite
- [ ] Sem `key` correta → 401, nada é enviado.
- [ ] Paciente em `missing` recebe o lembrete no canal certo (conferir com a preferência da Ana
      Livia).
- [ ] E-mail do Bruno chega com a lista correta de completos/pendentes do dia.
- [ ] Rodar 2x seguidas no mesmo dia não manda lembrete duplicado pro mesmo paciente (dedup por dia —
      decisão de implementação a confirmar no code review: registrar o envio em algum lugar, ex.
      reaproveitar `AuditLog`).
