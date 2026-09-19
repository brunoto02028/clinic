# QA spec — Atividade 52: Fechamento semanal

## T-1: Texto do fechamento semanal (lib)

- **API/unit** — `buildWeeklyClosingText("Ana Livia", "en")` contém "Hi Ana Livia!" e o corpo EN
  aprovado, sem listar itens.
- **API/unit** — `buildWeeklyClosingText("Ana Livia", "pt")` contém "Olá Ana Livia!" e o corpo PT
  aprovado.
- **API/unit** — `startOfWeek` de quinta volta pra segunda da mesma semana; de domingo, volta pra
  segunda anterior (não pra próxima).

## T-2: Rota de envio + status (API)

- **API happy path** — `POST /api/admin/patients/[id]/weekly-closing` com `{locale:"en"}` numa
  paciente com plano ativo → 200, `ClinicMessage` criado com título "Weekly Check-in" e o texto
  EN certo, `AuditLog` `WEEKLY_CLOSING_SENT_EN` criado.
- **API happy path** — mesmo teste com `{locale:"pt"}` → título "Fechamento da Semana", texto PT,
  `AuditLog` `WEEKLY_CLOSING_SENT_PT`.
- **API — idioma explícito vence preferência da paciente** — paciente com `preferredLocale:
  "pt-BR"`, `POST {locale:"en"}` → o `ClinicMessage.content` criado é o texto **EN**, não PT
  (confirma que `notifyPatient` não sobrescreveu a escolha do terapeuta).
- **API entrada inválida** — `POST {locale:"fr"}` → 400. `POST {}` (sem locale) → 400.
- **API auth** — staff de outra clínica tentando `GET`/`POST` nessa paciente → 404 (sem revelar
  se a paciente existe), mesmo padrão de `staffPatientAccess`.
- **API auth** — sem sessão → 401/redirect.
- **API dedupe** — `GET` depois de um `POST {locale:"en"}` retorna `en.sentAt` preenchido,
  `pt.sentAt: null`. Um segundo `POST {locale:"en"}` na mesma semana ainda funciona no backend
  (a UI é quem desabilita o botão) — confirmar que não há erro, só um novo envio.

## T-3: Card na ficha do paciente (UI)

- **UI** — abrir a ficha de uma paciente com protocolo ativo e pelo menos um item nunca marcado
  → card "Adherence" mostra "Weekly closing (EN)" com botão "Send now" (não mandado ainda).
- **UI** — clicar "Send now" (EN) → botão vira "Sent [data/hora]" e desabilita; reabrir/recarregar
  a página mantém esse estado (persistido via `AuditLog`, não só local).
- **UI** — "Weekly closing (PT)" continua com "Send now" habilitado depois de mandar só o EN
  (independência confirmada visualmente).
- **UI regressão** — seções "Today"/"Yesterday"/"Onboarding" continuam funcionando exatamente
  como antes (envio, preview, "Sent [data]") depois da mudança no `AdherenceSection`.
- **UI mobile** — viewport 390px, as duas seções novas não cortam texto nem quebram layout.
- **UI — sem plano** — paciente sem protocolo/prescrição nenhuma → card "Weekly closing" (EN/PT)
  não aparece (mesma regra das seções existentes).

## T-4: Preview de e-mail + Activity log

- **UI** — clicar "Preview" na seção EN → abre o e-mail com o texto EN certo, nome da paciente
  interpolado.
- **UI** — clicar "Preview" na seção PT → e-mail com texto PT.
- **UI** — depois de mandar um fechamento semanal (EN), a aba Activity da paciente mostra uma
  entrada nova com o rótulo certo ("Weekly closing sent (EN)").
- **API** — `GET /api/admin/adherence/preview-weekly-closing-email?patientId=X&locale=en` sem
  sessão → redirect/401 (rota de admin, não pública).
