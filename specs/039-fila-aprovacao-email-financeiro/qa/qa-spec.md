# QA — Atividade 39: Fila de aprovação para emails financeiros

## T-1: Schema

- **API** — Criar um `EmailMessage` de teste com `folder: PENDING_APPROVAL` e
  `attachmentsJson` preenchido (script/Prisma Studio local). Esperado: grava e lê sem erro.
- **API** — Confirmar que `GET /api/admin/email?folder=SENT` (e as outras pastas existentes)
  continuam retornando normalmente depois da migração. Esperado: sem regressão.

## T-2: Rota do invoice cria pendente

- **API** — `POST /api/admin/appointments/[id]/invoice` numa consulta válida. Esperado:
  resposta `{ success: true, pendingId, invoiceNumber }`, SEM disparo de email real (checar
  que não aparece novo item em `folder=SENT`).
- **API** — Conferir `GET /api/admin/email?folder=PENDING_APPROVAL`: o item criado aparece,
  com `toAddress`, `subject`, `attachmentsJson` corretos (mesmo valor/paciente da consulta).
- **API** — `POST` numa consulta inexistente. Esperado: 404, nenhum `EmailMessage` criado.
- **API** — `POST` numa consulta sem email de paciente. Esperado: 400, nenhum `EmailMessage`
  criado.

## T-3: API approveSend / discard

- **API** — `approveSend` num item pendente válido. Esperado: 200, o email é realmente
  enviado (Resend retorna id real), `EmailMessage` vira `folder: SENT` com `sentAt` e
  `messageId` preenchidos.
- **API** — `approveSend` num `id` que não existe. Esperado: erro (404), nada é enviado.
- **API** — `approveSend` num item que já está `SENT`. Esperado: erro, sem reenviar (evita
  duplicar envio por clique duplo).
- **API** — `discard` num item pendente válido. Esperado: 200, `folder: TRASH`, nenhum email
  disparado (checar Resend/logs).

## T-4: UI

- **UI** — Gerar um invoice de teste (paciente de QA, não real) → abrir
  `/admin/email` → aba "Pending Approval" → o item aparece com destinatário/assunto certos.
- **UI** — Clicar em "Preview" → o HTML do invoice renderiza corretamente (mesmo layout do
  `GET` de prévia da rota de invoice).
- **UI** — Clicar em "Approve & Send" → confirmação aparece → confirmar → item some da fila,
  aparece em "Sent", email realmente chega (checar inbox de teste ou log do Resend).
- **UI** — Gerar outro invoice de teste → clicar em "Discard" → item some da fila sem ir pra
  "Sent", nenhum email disparado.
- **UI** — Responsivo: a aba "Pending Approval" e os botões funcionam em largura de celular
  (~390px), sem quebrar layout.
