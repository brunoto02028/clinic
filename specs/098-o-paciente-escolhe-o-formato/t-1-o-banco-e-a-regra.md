# T-1: O banco e a regra de quem pode pedir o quê

**Status:** concluído (28/09/2026)
**Depende de:** nenhuma

## Objetivo

Guardar o pedido de formato ao lado da consulta, sem mexer no que a consulta é
hoje, e ter **um lugar só** que responde "este paciente pode pedir este formato
para este tratamento?".

## Contexto

`Appointment.mode` é o formato **efetivo** — o que vai acontecer. Ele continua
sendo isso. O pedido mora em campos novos, e só vira `mode` quando alguém
aprova.

## Passos

1. `AppointmentMode` ganha `HOME_VISIT`.
2. `TreatmentType` ganha `allowsHomeVisit Boolean @default(false)`. O vídeo
   **não** ganha campo: ele já é `requiresInPerson: false`.
3. `Appointment` ganha:
   - `requestedMode AppointmentMode?` — nulo quando não se pediu nada
   - `modeApprovedAt DateTime?`
   - `modeRefusedReason String?`
   - `modeDecidedById String?`
4. `lib/appointment-format.ts` (novo): `formatosPermitidos(tratamento, paciente)`
   e `pedidoPendente(consulta)`. As duas telas e as duas rotas leem daqui.
5. **O deploy aplica schema com `db push` e engole a falha** — conferir `in
   sync` no log do contêiner depois de subir.

## Arquivos afetados

- `prisma/schema.prisma`
- `lib/appointment-format.ts` (novo)

## Critérios de aceite

- [ ] Consulta sem pedido continua idêntica ao que é hoje
- [ ] `formatosPermitidos` recusa vídeo quando `requiresInPerson`
- [ ] Recusa domicílio sem endereço, cidade **ou** código postal
- [ ] `pedidoPendente` é verdadeiro só com `requestedMode` e sem decisão
- [ ] O log do contêiner diz `in sync` depois do deploy
