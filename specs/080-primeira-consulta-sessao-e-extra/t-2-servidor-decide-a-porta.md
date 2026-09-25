# T-2: O servidor decide a porta

**Status:** pendente
**Depende de:** T-1

## Objetivo
Uma rota que responde "o que acontece se este paciente marcar agora?", e a marcacao que obedece.

## Contexto
Hoje o `POST /api/appointments` aceita `price` e `treatmentType` do corpo, vindos do cliente. Para
o paciente isso e um problema alem de organizacao: um paciente ja marcou a propria sessao por
GBP 0,30 (esta escrito no proprio codigo, em `[id]/route.ts`). O preco e o tipo passam a ser
**decididos no servidor**.

## Passos
1. `GET /api/patient/booking-options` — devolve `{ kind, price, sessionsRemaining, requiresPayment,
   blockedReason }`. E a mesma funcao que a marcacao usa, para tela e servidor nunca divergirem.
2. `Appointment.kind`: `FIRST_CONSULTATION | PACKAGE_SESSION | EXTRA_SESSION | CLINIC_BOOKED`.
3. `POST /api/appointments` vindo de paciente: ignora `price` e `treatmentType` do corpo e usa o
   que a funcao decidiu.
4. `requiresPayment` cria a consulta em `PENDING_PATIENT` e devolve o link do Stripe; o webhook
   confirma.
5. `Clinic.extraSessionPayment`: `AT_BOOKING | INVOICE`, default `INVOICE`.

## Arquivos afetados
- `lib/booking-options.ts` (novo), `app/api/patient/booking-options/route.ts` (novo),
  `app/api/appointments/route.ts`, `app/api/webhooks/stripe/route.ts`, `prisma/schema.prisma`

## Criterios de aceite
- [ ] Paciente sem triagem: recusado, com motivo
- [ ] Paciente novo com triagem: `FIRST_CONSULTATION`, preco do `ServicePrice`, exige pagamento
- [ ] Com sessao no pacote: `PACKAGE_SESSION`, preco zero, consome
- [ ] Pacote esgotado: `EXTRA_SESSION`, preco avulso, cobranca conforme a clinica
- [ ] `price` mandado pelo cliente e **ignorado**
- [ ] Sem pagamento confirmado, o horario nao fica reservado
