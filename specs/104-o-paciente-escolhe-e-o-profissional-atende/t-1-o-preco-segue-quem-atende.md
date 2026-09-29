# T-1: O preço segue o profissional escolhido

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

O valor que o paciente vê ao escolher o profissional é o valor que ele paga.

## Contexto — isto é defeito, não melhoria

`bookingOptionsFor(patientId)` abre com `const clinicId = paciente.clinicId` — a
clínica **do paciente**. O catálogo, por outro lado, mostra o preço do inquilino
**do profissional** (`patientBookingPrice(c.id)`).

Então: o catálogo diz "Dr. X — £150", a pessoa escolhe, e a tela de marcar diz
£100, que é o preço da reabilitação. Ninguém é avisado. Se ela confirmar, paga o
que a reabilitação cobra por uma consulta que o médico dá.

A 102 já leva o profissional escolhido até a criação da consulta
(`professionalId` no corpo, `alvo.clinicId` no servidor). O preço ficou para trás.

## Passos

1. `bookingOptionsFor` passa a receber o profissional escolhido (opcional) e a
   precificar pelo inquilino **dele** quando houver.
2. A exceção por paciente (`PatientServicePrice`) continua valendo por cima —
   e o teste mede isso, porque é onde uma regra de preço costuma sumir.
3. A tela manda `professionalId` ao pedir as opções, e refaz o pedido quando
   troca de profissional.
4. **O servidor recalcula antes de cobrar** — já é assim no checkout, e o teste
   passa a guardar isso: o preço do corpo nunca vira valor cobrado.
5. Quando não há profissional escolhido, nada muda: é a casa atendendo.

## Arquivos afetados
- `lib/booking-options.ts`
- `app/api/patient/booking-options/route.ts`
- `mobile/app/(app)/(clinica)/book-appointment.tsx`, `mobile/src/api/booking.ts`
- `__tests__/agenda/o-preco-segue-quem-atende.test.ts`

## Critérios de aceite
- [ ] Preço do catálogo e preço da tela de marcar são o mesmo número.
- [ ] Trocar de profissional muda o preço na hora.
- [ ] Exceção por paciente vence o preço do profissional.
- [ ] Sem profissional escolhido, o comportamento de hoje é idêntico.
- [ ] O valor cobrado sai do servidor, nunca do corpo do pedido.
