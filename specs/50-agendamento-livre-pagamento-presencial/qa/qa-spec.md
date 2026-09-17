# QA — Atividade 50: Agendamento livre com pagamento presencial

## T-1 — Schema

- **API**: `npx prisma validate` retorna sucesso.
- **API**: após migration, `SELECT "paymentMethod" FROM "Appointment" LIMIT 1` (num
  `Appointment` já existente) retorna `ONLINE`.

## T-2 — Auto-grant no intake

- **API**: criar paciente de teste com link de convite, completar `POST /api/intake/[token]`
  com dados válidos → depois, `GET /api/patient/status` (logado como esse paciente) retorna
  `serviceAccess.CONSULTATION === true`.
- **API**: paciente que já tinha `ServiceAccess` de `CONSULTATION` liberado manualmente antes
  → completar intake não duplica o registro (`GET /api/admin/service-access?patientId=...`
  continua com um único registro).
- **API**: forçar um erro no upsert (ex.: mock) → `POST /api/intake/[token]` ainda retorna
  `200 { success: true }` (não quebra o cadastro).
- **UI**: paciente novo, logo após terminar o intake e fazer login, acessa
  `/dashboard/appointments` direto (sem passar pelo paywall "Get Access to Consultation
  Booking").

## T-3 — Escolha de forma de pagamento

- **UI**: paciente sem pacote ativo, no passo 2 do booking (resumo antes de confirmar), vê a
  escolha "Pagar online agora" / "Pagar presencialmente", com "Pagar online agora"
  pré-selecionado.
- **UI**: paciente com pacote ativo (`hasActivePackage`) não vê essa escolha.
- **UI**: escolher "Pagar presencialmente" e confirmar → tela de sucesso (passo 3) mostra o
  texto de "consulta já confirmada, pague na clínica", em pt-BR e en-GB.
- **UI**: escolher "Pagar online agora" e confirmar → tela de sucesso mantém o texto atual
  ("receberá um e-mail com... link de pagamento").
- **API** (via Network tab ou request log): o `POST /api/appointments` disparado pelo form
  inclui `paymentMethod` no body, batendo com a escolha feita.

## T-4 — API: paymentMethod + confirmação automática

- **API**: `POST /api/appointments` com `paymentMethod: "IN_PERSON"` → resposta tem
  `appointment.status === "CONFIRMED"` e `appointment.paymentMethod === "IN_PERSON"`.
- **API**: `POST /api/appointments` com `paymentMethod: "ONLINE"` → `status === "PENDING"`
  (igual hoje).
- **API**: `POST /api/appointments` sem mandar `paymentMethod` (simulando uma chamada antiga,
  ex.: staff criando consulta) → `status === "PENDING"`, `paymentMethod === "ONLINE"` (default
  do schema).
- **API**: `POST /api/appointments` com `paymentMethod: "CASH"` (valor inválido) → `400`.
- **API**: sem sessão válida → `401` (comportamento já existente, não deve regredir).
- **E-mail**: consulta criada com `IN_PERSON` → e-mail ao paciente não menciona link de
  pagamento; e-mail interno ao admin mostra "Payment: Pay in person".
- **E-mail**: consulta criada com `ONLINE` → e-mails idênticos ao comportamento atual.

## T-5 — Visibilidade admin

- **UI**: `/admin/appointments`, consulta com `paymentMethod: IN_PERSON` mostra o badge "Pay
  in person" ao lado do badge de status.
- **UI**: consulta `ONLINE` não mostra esse badge extra (lista visualmente igual a hoje).
- **UI**: `/dashboard/appointments/[id]` (ou equivalente admin) de uma consulta `IN_PERSON` não
  paga mostra o estado "a pagar presencialmente" no card de Payment, com preço visível e botão
  "Pay Now" ainda clicável.
- **UI**: mesma tela para uma consulta `ONLINE` não paga mostra o "Payment Pending" de sempre,
  sem alteração visual.
