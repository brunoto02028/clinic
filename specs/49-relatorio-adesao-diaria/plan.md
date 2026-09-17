# Ativ. 49 — Relatório diário de adesão + lembrete ao paciente

**Status:** T-1/T-2/T-3/T-5/T-6 concluídos e no ar (16/09/2026) — T-4 (WhatsApp) adiada. Ampliada em
17/09/2026 com follow-up de "ontem", painel por paciente, lembretes com itens detalhados, e lembrete
de onboarding pendente a cada 2 dias — ver "Extensões" no final.

## Objetivo
Todo fim de dia: (1) avisar o Bruno, por e-mail + WhatsApp + um painel no admin, quem completou e
quem não completou as atividades prescritas do dia; (2) mandar um lembrete automático pro paciente
que ainda não completou.

## Situação atual (levantada em 16/09/2026)
- `ExerciseCompletionLog` (Ativ. 42/43) já registra, por dia, cada exercício marcado como feito —
  mas **nenhuma rota hoje agrega isso** em "paciente completou tudo hoje" nem em "N de M pacientes
  completaram hoje". A única leitura de adesão diária existente é a do próprio paciente
  (`app/api/patient/adherence/route.ts`), por semana, via `DailyCheckIn` (um check-in solto, não
  cruzado item a item).
- A lógica de "quais itens são esperados hoje" já existe, mas só no cliente:
  `app/dashboard/treatment/page.tsx` (`todayProtocolTasks`/`todayPrescriptionTasks`) — filtra itens
  do protocolo por semana atual + `hiddenFromPatient` + prescrições avulsas ativas. É a fonte da
  verdade visual (o "Today" card do próprio paciente) e o relatório precisa bater exatamente com o
  que o paciente vê — por isso essa regra é extraída pro servidor (T-1), não reescrita do zero.
- Já existe um cron real: `app/api/cron/*`, chamado de fora via `?key=CRON_SECRET`
  (`process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET`). O `exercise-reminders` existente usa
  campos antigos (`type`, `isCompleted` simples) e não reflete a adesão diária de verdade — não será
  reaproveitado, mas confirma o padrão de rota/autenticação a seguir.
- Já existe um canal de notificação ao **paciente** pronto: `lib/notify-patient.ts` — escolhe
  WhatsApp → Telegram → SMS → e-mail pela preferência salva em `communicationPreference`. É reaproveitado
  como está para o lembrete do paciente.
- Para notificar o **Bruno** (não um paciente), os dois primitivos de envio já existem e são
  genéricos, não amarrados a paciente: `sendEmail()` (`lib/email.ts`) e `sendWhatsAppMessage()`
  (`lib/whatsapp.ts`) — chamados diretamente com o destino do Bruno em vez de passar por
  `notifyPatient`.
- **Achado à parte, fora do escopo**: `lib/notifications/patient-notifications.ts` chama
  `prisma.notification.create(...)`, mas não existe model `Notification` no schema — esse caminho
  quebraria se fosse exercitado. Não mexo nisso aqui; só registrando.

## Decisões de design (a partir das suas respostas)
1. **Começa só por e-mail.** WhatsApp (T-4) e o painel no admin (T-5) continuam no plano, mas depois
   — a primeira entrega é e-mail diário pro Bruno + lembrete ao paciente.
2. **Gatilho: 21h no fuso da clínica** (`Europe/London`), só se sobrou algo — roda 1x por dia,
   olhando o dia que está terminando.
3. **Todos os pacientes com protocolo ativo** entram automaticamente — sem lista de opt-in por
   paciente nesta atividade.
4. **Uma função só decide "o que é esperado hoje"** (T-1), usada tanto pelo relatório quanto,
   futuramente, para manter o "Today" do paciente em sincronia — evita a mesma regra escrita duas
   vezes e divergindo com o tempo.
5. **Paciente sem nenhum item esperado hoje** (protocolo pausado, nada agendado pra essa semana) não
   entra nem como "completou" nem como "não completou" — fica de fora do relatório desse dia.
6. **Destino do e-mail**: a própria conta "Bruno Admin" (`admin@bpr.clinic`, confirmado via sessão).
7. **Quem chama o cron**: a API de Coolify tem um recurso de "scheduled tasks" por aplicação, hoje
   vazio para o app `clinic` — em vez de depender de um agendador externo, cadastro o agendamento
   direto lá (roda um comando dentro do container, ex. `curl` batendo no próprio
   `/api/cron/daily-adherence?key=...`, no horário certo). Só um detalhe a resolver na implementação:
   o agendador do Coolify provavelmente roda no fuso do servidor, não automaticamente no da clínica —
   preciso conferir isso e, se for o caso, ajustar a expressão cron pra bater com 21h de Londres
   (considerando horário de verão).

## Tarefas

| T-N | Nome | Status |
|-----|------|--------|
| T-1 | Função server-side "o que é esperado hoje" por paciente | concluído |
| T-2 | Agregação de adesão diária por clínica | concluído |
| T-3 | Cron `daily-adherence`: lembrete ao paciente + e-mail ao Bruno + agendamento no Coolify | concluído |
| T-4 | Resumo diário por WhatsApp ao Bruno | adiada (depois do e-mail estar rodando) |
| T-5 | Painel "Adesão de hoje" no admin | concluído |
| T-6 | QA de ponta a ponta | concluído |

## Resultado (16/09/2026)
- Implementado e no ar: `lib/patient-daily-adherence.ts` (T-1), `lib/clinic-daily-adherence.ts` (T-2),
  `app/api/cron/daily-adherence` + agendamento ativo no Coolify às 21h/BST (T-3),
  `app/api/admin/adherence/today` + card no dashboard (T-5).
- Durante o QA, achados e corrigidos: e-mail-resumo duplicava se o cron rodasse 2x no mesmo dia
  (dedupe adicionado, igual ao do lembrete); `limit=0`/mapeamento de `AuditLog.action` não se
  aplicam aqui (isso foi achado da Ativ. 48).
- O template do e-mail passou por 3 rodadas de ajuste visual a pedido do usuário, terminando num
  rebrand do **cabeçalho compartilhado** de todos os e-mails do sistema (`lib/email-templates.ts`,
  `wrapInLayout`) — fundo creme + logo escuro/colorido + linha fina de destaque, em vez do bloco
  verde sólido com logo branco de antes. Detalhes completos em `qa/report-t-6.md`.
- Endpoint novo `GET /api/admin/adherence/preview-email` (gated por sessão de admin, não pela chave
  do cron) para revisar o e-mail sem enviar — decisão de segurança: a chave do cron nunca pode
  aparecer numa URL aberta em navegador.
- T-4 (WhatsApp pro Bruno) segue adiada, sem código escrito ainda.

## Suposições (validar com o usuário)
1. **Item "esperado hoje"**: mesma regra do "Today" do paciente — itens `HOME_EXERCISE`/`HOME_CARE`
   do protocolo ativo dentro da semana atual e não escondidos, mais prescrições avulsas ativas.
   Itens `IN_CLINIC`/`ASSESSMENT` não contam (não são "adesão em casa").
2. **"Completou tudo"** = todo item esperado hoje tem uma linha em `ExerciseCompletionLog` com
   `completedDate` = hoje. Não é "fez alguma coisa", é "fez tudo que foi pedido".

## Extensões (17/09/2026, mesma sessão)

A partir do preview real, o usuário pediu ajustes e um recurso novo, todos implementados na mesma
atividade em vez de uma nova, por serem extensão direta do mesmo domínio:

1. **Follow-up de "ontem"** (`lib/daily-adherence-email.ts` — `buildYesterdayFollowupEmail`/
   `buildYesterdayFollowupText`): mensagem de apoio, não de cobrança, nomeando o que ficou pendente
   ontem e convidando a pedir ajuda. Mesma máquina de `getExpectedToday`/`getClinicDailyAdherence`,
   só com `date` = ontem. Dedupe próprio (`YESTERDAY_FOLLOWUP_SENT`).
2. **Painel por paciente** (`components/admin/patient-adherence-panel.tsx`, na aba Summary do perfil):
   card "Adherence" com uma seção por tipo de lembrete (Today / Yesterday / Onboarding), cada uma com
   "Preview" (abre o e-mail de verdade num modal, sem sair da página) e "Send now" — pedido explícito
   do usuário: "eu preciso ver o preview aqui antes".
3. **Preview sem enviar**, um endpoint por tipo de e-mail, todos gated por sessão de admin (nunca
   pela chave do cron — decisão de segurança, a chave nunca pode aparecer numa URL de navegador).
4. **Cabeçalho de e-mail rebrandado**: o `wrapInLayout` compartilhado (usado por todo e-mail do
   sistema) tinha um bloco verde sólido com logo branco que não batia com a home real do site —
   trocado por fundo creme + logo colorido da clínica + linha fina de destaque.
5. **Itens detalhados no e-mail de "hoje"**: `buildPatientReminderEmail` passou a listar os itens
   pendentes (antes só dizia "you still have activities left", sem dizer quais).
6. **Aviso de risco no sino do paciente**: a notificação in-app de "sobrou atividade hoje" passou a
   mencionar risco de complicações/atraso na recuperação, marcada como urgente.
7. **Lembrete de onboarding pendente, a cada 2 dias** (`lib/onboarding-reminder.ts`,
   `app/api/cron/onboarding-reminder`): perfil incompleto, triagem não enviada, consentimento não
   aceito — mesmo formato de e-mail/preview/send-now dos outros dois. Dedupe por janela de 48h (não
   "hoje"), então um cron diário só acaba lembrando o paciente a cada 2 dias de fato. Pedido do
   usuário: "precisamos dos registros dentro do log" — por isso os `AuditLog` dessas ações agora
   também aparecem com título legível na aba Activity (Ativ. 48) do paciente, em vez de "OTHER".
   Scheduled task `onboarding-reminder` criada no Coolify (uuid `mefyxrlxovqtrqbnoipge6mn`), mesmo
   horário do cron principal (`0 20 * * *` UTC = 21h BST), **desativada** até validar manualmente.
8. **Dois bugs achados e corrigidos durante o próprio teste do usuário**: (a) preview em `<iframe>`
   ficava preso num 404 em cache do navegador mesmo com a rota já funcionando — corrigido com
   `Cache-Control: no-store` + cache-busting + montar o iframe só enquanto o modal está aberto; (b) o
   botão de call-to-action navegava o próprio iframe do preview (em vez de abrir aba nova), o que
   parecia o mesmo erro de novo quando testado como staff — corrigido com `target="_blank"`.
