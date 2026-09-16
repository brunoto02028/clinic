# Ativ. 49 — Relatório diário de adesão + lembrete ao paciente

**Status:** T-1/T-2/T-3/T-5/T-6 concluídos e no ar (16/09/2026) — T-4 (WhatsApp) adiada

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
