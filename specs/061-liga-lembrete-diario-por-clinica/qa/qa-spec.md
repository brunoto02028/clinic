# QA spec — Atividade 61: Botão pra ligar o lembrete diário automático

## T-1: Campo no schema + gate no cron

- **API** — `POST /api/cron/daily-adherence?key=SECRET` numa clínica com `dailyRemindersEnabled:
  false` (padrão) → nenhum `ClinicMessage`/notificação criada pra pacientes dessa clínica,
  `results` não inclui essa clínica (ou inclui com `remindersSent: 0` sem ter tentado).
- **API** — mesma clínica com `dailyRemindersEnabled: true` e um paciente com item pendente hoje
  → paciente recebe o lembrete, `AuditLog` `DAILY_ADHERENCE_REMINDER_SENT` criado.
- **API — regressão** — `POST /api/admin/adherence/send-reminder {patientId}` (botão manual)
  continua funcionando numa clínica com o toggle desligado.
- **API auth** — `key` errado/ausente → 401 (comportamento já existente, só confirmar que não
  regrediu).

## T-2: Toggle na UI + religar task no Coolify

- **UI** — `/admin/clinics`, abrir Settings de uma clínica → toggle novo aparece, estado inicial
  bate com o banco.
- **UI** — ligar o toggle, salvar → reabrir o dialog mostra o toggle ligado (persistiu).
- **UI regressão** — toggle de Instagram Import e os campos de Plan limits continuam funcionando
  exatamente como antes.
- **Infra** — confirmar via API do Coolify que a task `daily-adherence` está `enabled: true`
  depois desta tarefa (checagem read-only, não precisa disparar a task de verdade no teste).
