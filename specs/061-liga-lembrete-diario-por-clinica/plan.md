# Atividade 61 — Botão pra ligar o lembrete diário automático

## Objetivo

Dar ao Bruno um botão de self-service (sem precisar me pedir pra mexer no Coolify) que liga o
lembrete diário automático — quando ligado, todo paciente com um protocolo ativo que não marcar
os itens do dia recebe automaticamente o lembrete "still time today" (o mesmo texto que já existe
hoje, só que sem precisar clicar "Send now" um por um). Continua desligado por padrão até ele
revisar o texto e decidir ligar.

## Contexto técnico já levantado

- `app/api/cron/daily-adherence/route.ts` já existe, já testado, já funciona — hoje só é
  disparado manualmente (`send-reminder`) porque a task agendada no Coolify (`daily-adherence`,
  uuid `kudbnaznqbvkdbaxxdbidsq5`) está **desligada** desde 17/09/2026, a pedido explícito do
  Bruno ("nunca enviar nada a paciente automaticamente").
- A rota já faz o loop certo por clínica (`prisma.clinic.findMany({ where: { isActive: true } })`)
  e por paciente dentro de cada clínica — só falta um gate por clínica antes de mandar.
- `app/admin/clinics/page.tsx` já tem exatamente o lugar certo pra esse tipo de toggle: um dialog
  de "Settings" por clínica (hoje só com `Instagram Import`), salvando via
  `PATCH /api/admin/clinics/[id]` — rota já testada nesta sessão, corretamente restrita a
  `SUPERADMIN` e escopada por `clinicId` na própria URL.
- **Não uso a rota `/api/settings`** pra esse toggle — achamos nesta sessão (revisão do branch
  Personal, 18/09) que ela tem um problema de escopo (qualquer ADMIN grava configuração global,
  não só da própria clínica). Não é escopo desta atividade consertar isso, só evitar construir
  em cima dela.

## Decisões de design

1. **Campo novo**: `Clinic.dailyRemindersEnabled Boolean @default(false)` — padrão desligado,
   inclusive pra clínica nova (Emanuel/Manu Training incluído, ele nunca pediu isso).
2. **Gate**: `app/api/cron/daily-adherence/route.ts` só processa uma clínica se
   `dailyRemindersEnabled: true` — um `where` a mais na query que já existe, não muda a lógica de
   dentro do loop.
3. **Coolify**: religo a task agendada `daily-adherence` como parte desta atividade (ela já existe
   pronta, só precisa voltar a rodar) — mas como o campo novo nasce `false`, ela roda todo dia e
   não manda nada pra ninguém até você ligar o toggle da BPR. Efetivamente inofensiva até você
   decidir ligar.
4. **UI**: reaproveita o dialog de Settings que já existe em `app/admin/clinics/page.tsx`, ao lado
   do toggle de Instagram Import, mesmo componente (`Switch`), mesmo texto de aviso claro sobre o
   que ele faz.
5. **Escopo deliberadamente estreito**: só o lembrete "hoje ainda dá tempo" (`daily-adherence`).
   O follow-up de "ontem" (`send-yesterday-followup`) e o lembrete de onboarding
   (`onboarding-reminder`) continuam manual-only — nenhum cron aciona eles hoje, e você não pediu
   isso especificamente. Ver Suposição 1.
6. **Envio manual não muda**: os botões "Send now" (hoje/ontem/onboarding/fechamento semanal) na
   ficha do paciente continuam funcionando sempre, independente desse toggle — ele só liga/desliga
   o envio *automático*.

## Suposições (peço validação)

1. O toggle cobre só o lembrete diário de "hoje" (que foi o que você descreveu: "avisado
   diariamente se ele não fizer o combinado"). Se quiser que "ontem" e "onboarding" entrem no
   mesmo toggle (ou tenham o próprio), me avisa — é uma tarefa pequena a mais, não a incluí pra
   não presumir demais.
2. Vou religar a task do Coolify como parte da implementação (fica sempre rodando, gated pelo
   flag). Se preferir que eu deixe ela desligada e só documente como religar depois, também dá —
   mas aí o botão na UI não faz nada sozinho até alguém religar a task manualmente.
3. O toggle é por clínica (não um interruptor global) — faz sentido dado que o projeto já é
   multi-tenant (BPR + Manu Training) e cada dono deve poder decidir isso pra si.

## Tarefas

| Tarefa | Nome | Status |
|---|---|---|
| T-1 | Campo no schema + gate no cron | concluído |
| T-2 | Toggle na UI de clínicas + religar task no Coolify | concluído |

## QA e code review

QA (agente qa-tester, ambiente local, fixture `QA Clinic A` com `OUTBOUND_MODE` em sink — nenhum
envio real sai): 9/9 cenários aprovados — cron respeita o toggle (desligado não manda nada,
ligado manda e registra `AuditLog`), botão manual "Send now" não é afetado pelo toggle, toggle
na UI persiste de verdade (confirmado com reload), Instagram Import e Plan limits sem regressão,
task `daily-adherence` religada no Coolify confirmada. `tsc`/`lint` limpos.

Achados fora do escopo (não corrigidos, pré-existentes): hydration mismatch em `SectionTabs` +
403 em `GET /api/admin/notifications` em qualquer `/admin/*`; log de aviso sobre múltiplas
clínicas ativas sem `DEFAULT_CLINIC_SLUG` no ambiente local (não é bug da feature).

Code review (self-review): achou 2 comentários com o número errado (`act.60` em vez de `act.61`
em `prisma/schema.prisma` e `daily-adherence/route.ts` — resquício da renumeração desta sessão),
corrigidos.
