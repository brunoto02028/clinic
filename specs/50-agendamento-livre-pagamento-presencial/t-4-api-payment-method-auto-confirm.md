# T-4: API de criação de consulta — `paymentMethod` + confirmação automática

**Status:** concluído
**Depende de:** T-1

## Objetivo
`POST /api/appointments` aceita `paymentMethod`, grava no `Appointment`, e confirma a consulta
automaticamente (`status: CONFIRMED`) quando o paciente escolheu pagar presencialmente.

## Contexto
Ver decisão D3, suposição 5 em `plan.md`. Hoje toda consulta nasce `PENDING`
(`app/api/appointments/route.ts:183`) e só é confirmada manualmente pelo staff
(`components/appointments/appointment-detail.tsx:594-609`, `PATCH /api/appointments/[id]`).
Isso continua idêntico para `paymentMethod === "ONLINE"` (ou quando o campo não vem, ex.:
staff criando consulta em nome do paciente).

## Passos
1. Em `app/api/appointments/route.ts`, no `POST` (linha 122), extrair `paymentMethod` do body:
   ```ts
   const { dateTime, duration, treatmentType, notes, therapistId, price, paymentMethod } = body ?? {};
   ```
2. Validar: se vier, só aceitar `"ONLINE"` ou `"IN_PERSON"` (400 se outra coisa). Default
   `"ONLINE"` se ausente/vazio — preserva o comportamento atual para chamadas que não mandam o
   campo (ex.: staff via admin).
3. Na criação (linha 173-184), incluir:
   ```ts
   paymentMethod: resolvedPaymentMethod,
   status: resolvedPaymentMethod === "IN_PERSON" ? "CONFIRMED" : "PENDING",
   ```
4. Ajustar o texto do e-mail/notificação ao paciente (`notifyPatient` em
   `app/api/appointments/route.ts:215-229`) para não prometer "payment link" quando for
   `IN_PERSON` — usar duas variações de `plainMessage`/`plainMessagePt` conforme
   `resolvedPaymentMethod` (mesmo padrão de string condicional já usado ali).
5. Ajustar o e-mail interno pro admin (linha 240-261) para incluir uma linha
   `<strong>Payment:</strong> ${resolvedPaymentMethod === "IN_PERSON" ? "Pay in person" : "Online"}`
   — dá pra você ver isso direto no e-mail de notificação de nova consulta, sem precisar abrir
   o admin.

## Arquivos afetados
- `app/api/appointments/route.ts`

## Critérios de aceite
- [ ] `paymentMethod: "IN_PERSON"` → `Appointment` criado com `status: "CONFIRMED"` e
      `paymentMethod: "IN_PERSON"`.
- [ ] `paymentMethod: "ONLINE"` ou ausente → `status: "PENDING"` (comportamento atual,
      regressão coberta).
- [ ] Valor inválido de `paymentMethod` (ex.: `"CASH"`) → `400`.
- [ ] E-mail ao paciente e e-mail interno ao admin refletem a escolha corretamente.
- [ ] `npx tsc --noEmit` e `npx next lint` limpos no arquivo.
