# T-25: Aulas em grupo

**Status:** pendente
**Trilha:** PERSONAL
**Depende de:** T-20

## Objetivo
O personal oferece turmas (small group, bootcamp) com vagas limitadas (achado M3).

## Passos
1. Modelos novos, com migração aditiva:
   - `ClassSession`: tenant, personal, título, início, duração, capacidade, local ou link.
   - `ClassBooking`: aula, aluno, status, presença.
2. Personal: criar, editar e cancelar aulas; lista de presença.
3. Aluno (web e app): ver aulas do tenant, reservar e cancelar; bloqueio quando lotada.

## Critérios de aceite
- [ ] Cenários da T-25 passando.
