# T-1: A sessao do pacote passa a ser consumida de verdade

**Status:** pendente
**Depende de:** nenhuma

## Objetivo
Marcar uma consulta dentro do pacote gasta uma sessao; cancelar devolve.

## Contexto
`PatientPackage.sessionsUsed` existe desde sempre e **ninguem incrementa** — conferido por
`grep` em `app/`, `lib/` e `components/`: zero leitores, zero escritores. O numero fica em zero
para sempre, e o pacote de 10 sessoes nao limita nada.

O contador sozinho nao basta: sem saber **qual** consulta gastou **qual** sessao, cancelar nao
tem como devolver, e um erro de contagem nao tem como ser auditado.

## Passos
1. `Appointment.patientPackageId` (nullable) — qual pacote pagou por esta consulta.
2. `lib/package-sessions.ts`: `sessionsRemaining(patientId)` conta por consultas ligadas e nao
   canceladas, nao pelo contador; `consumeSession` e `releaseSession` mantem `sessionsUsed` em dia
   para o numero parar de mentir.
3. Cancelar devolve; `NO_SHOW` nao devolve.
4. Pacote vencido (`endDate` no passado) nao oferece sessao.

## Arquivos afetados
- `prisma/schema.prisma`, `lib/package-sessions.ts` (novo), `app/api/appointments/[id]/route.ts`

## Criterios de aceite
- [ ] Pacote de 10: a 11a marcacao nao entra como sessao de pacote
- [ ] Cancelar devolve a sessao; `NO_SHOW` nao
- [ ] `sessionsUsed` bate com as consultas ligadas
- [ ] Pacote vencido nao oferece sessao
- [ ] Nenhum pacote de outra clinica entra na conta
