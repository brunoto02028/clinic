# T-2: `Appointment.clinicId` obrigatório

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Todo agendamento tem uma clínica dona, sempre — sem exceção, sem `null`.

## Contexto
`Appointment.clinicId` ainda é `String?` no schema. Confirmado em 13/09/2026 existirem 3 registros com `clinicId: null` no banco local. Isso é exatamente o tipo de brecha que `lib/tenant-access.ts` deveria impedir, mas um campo opcional no schema permite escapar dela silenciosamente.

## Passos
1. Script de backfill (`scripts/backfill-appointment-clinicid.js`, idempotente, mesmo padrão dos outros scripts de boot deste projeto): pra cada `Appointment` com `clinicId: null`, resolve pelo `clinicId` do PACIENTE (`Appointment.patient.clinicId`) — se o paciente também não tiver, usa o tenant padrão (`lib/default-tenant.ts`) em vez de travar (ver Suposição 3).
2. Rodar o backfill local e confirmar 0 registros `null` restantes.
3. `prisma/schema.prisma`: `Appointment.clinicId` de `String?` pra `String` (obrigatório). `db push` local.
4. Auditar todo `prisma.appointment.create(...)` no código (`app/api/appointments/route.ts`, `app/api/admin/appointments/route.ts`, `app/api/webhooks/vapi/route.ts`) — confirmar que todos já passam `clinicId` explicitamente; corrigir os que não passam.
5. Adicionar o backfill em `start.sh` (mesmo padrão dos outros scripts de manutenção de boot), rodando ANTES do `db push` do schema obrigatório entrar em prod (a ordem de deploy natural: primeiro o backfill roda com o campo ainda opcional, só depois de confirmado local o schema muda pra obrigatório).

## Arquivos afetados
- `prisma/schema.prisma`
- `scripts/backfill-appointment-clinicid.js` (novo)
- `start.sh`
- Os 3 arquivos que criam `Appointment`, se precisarem de correção

## Critérios de aceite
- [x] Backfill roda local, resolve os 3 registros `null` existentes.
- [x] Rodar o backfill duas vezes seguidas não muda nada na segunda (idempotência).
- [x] Schema com `clinicId` obrigatório, `db push` sem erro (depois do backfill).
- [x] Todos os pontos de criação de `Appointment` confirmados passando `clinicId`.

## Resultado
`scripts/backfill-appointment-clinicid.js` resolve pelo clinicId do paciente, com fallback pro tenant padrão e, só nesta migração histórica, pra clínica ativa mais antiga (nunca no caminho de reserva ao vivo). Roda ANTES do `db push` em `start.sh` (única exceção à ordem dos demais scripts de manutenção, documentada no próprio arquivo) — usa SQL raw pra achar os órfãos porque o Prisma Client já gerado como obrigatório rejeita `where: { clinicId: null }` em runtime mesmo com a coluna física ainda opcional (descoberto e verificado durante QA). `Appointment.clinicId` agora `String` obrigatório no schema. Dos 3 pontos de criação, 2 já passavam `clinicId`; `app/api/webhooks/vapi/route.ts` (AI Receptionist por voz) foi corrigido — e, na revisão de código, também parou de usar uma clínica arbitrária pro paciente-convidado e passou a escopar a busca do terapeuta pelo mesmo tenant do agendamento (achado de cross-tenant real, corrigido e verificado). QA e code review (2 rodadas cada) aprovados — ver `qa/report-t-2.md`.
