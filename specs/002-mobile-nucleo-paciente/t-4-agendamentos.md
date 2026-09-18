# T-4: Agendamentos — lista + detalhe

**Status:** concluído (QA `report-t-4.md` aprovado 3/3)
**Depende de:** T-1, T-2

## Objetivo
Tela de agendamentos do paciente: lista (próximos/passados) e tela de detalhe (leitura).

## Passos
1. Query da lista via `GET /api/appointments` (do paciente autenticado).
2. Lista agrupada/ordenada (próximos primeiro), com card por agendamento.
3. Detalhe via `GET /api/appointments/[id]`: data/hora, terapeuta, tipo, status, notas.
4. Estados loading/erro/vazio; pull-to-refresh.
5. Reagendar/cancelar **fora desta fase** (Suposição #3).

## Arquivos afetados
- `mobile/app/(app)/(tabs)/appointments.tsx`
- `mobile/app/(app)/appointment/[id].tsx` (detalhe)
- `mobile/src/api/appointments.ts`

## Critérios de aceite
- [ ] Lista exibe agendamentos reais do paciente.
- [ ] Toque abre o detalhe correto.
- [ ] Estado vazio coerente quando não há agendamentos.
- [ ] Paciente não vê agendamentos de outros (escopo da T-1).
