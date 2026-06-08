# T-3: Home (dashboard) — próximo agendamento + resumo

**Status:** pendente
**Depende de:** T-1, T-2

## Objetivo
Substituir o placeholder da Home por um dashboard real com saudação, próximo
agendamento e atalhos para as demais abas.

## Passos
1. Query do próximo agendamento (via `/api/appointments`, filtrando futuro mais próximo).
2. Card de "Próximo agendamento" (data/hora, terapeuta, tipo) ou estado vazio.
3. Saudação com nome do paciente (do store/`/me`).
4. Atalhos para Agendamentos / Exercícios / Perfil.
5. Estados de loading/erro/vazio.

## Arquivos afetados
- `mobile/app/(app)/(tabs)/index.tsx`
- `mobile/src/api/appointments.ts` (query)

## Critérios de aceite
- [ ] Home mostra saudação com o nome real.
- [ ] Próximo agendamento real exibido (ou estado vazio coerente).
- [ ] Atalhos navegam para as abas corretas.
- [ ] Loading/erro tratados.
