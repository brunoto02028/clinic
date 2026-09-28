# T-2: O paciente escolhe, no app

**Status:** pendente
**Depende de:** T-1

## Objetivo

A tela de agendar passa a perguntar o formato — e só oferece o que pode
acontecer.

## Contexto

Hoje ela pergunta *para quem é*, o serviço, a data e a hora. O formato entra
depois do serviço, porque é o serviço que decide quais opções existem.

## Passos

1. `/api/patient/booking-options` passa a devolver, por tipo de tratamento, os
   formatos permitidos.
2. Seletor com três opções, e as bloqueadas **não aparecem** — em vez de
   aparecerem cinzas.
3. Sem endereço completo, o domicílio sai da lista e uma linha explica:
   *"Complete o seu endereço no perfil para pedir atendimento em casa."*, com
   atalho para o perfil.
4. Escolher algo diferente de "Na clínica" mostra, **antes de confirmar**, que
   aquilo é um pedido: *"A clínica confirma o formato. Até lá, a consulta fica
   marcada na clínica."*
5. `POST /api/appointments` aceita `requestedMode` **do paciente** e grava
   `mode: IN_PERSON` + `requestedMode`. Nunca grava `mode` pelo corpo.

## Arquivos afetados

- `mobile/app/(app)/(clinica)/book-appointment.tsx`
- `mobile/src/api/booking.ts`
- `app/api/appointments/route.ts`
- `app/api/patient/booking-options/route.ts`

## Critérios de aceite

- [ ] Eletroterapia não oferece vídeo
- [ ] Sem endereço, não oferece domicílio, e diz por quê
- [ ] O texto deixa claro que é pedido, **antes** de confirmar
- [ ] `mode` mandado pelo corpo é ignorado
- [ ] Marcar sem tocar no seletor funciona exatamente como hoje
