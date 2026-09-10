# T-14: Backfill de `clinicId` na agenda + obrigatório nas escritas

**Status:** pendente
**Trilha:** PLATAFORMA
**Depende de:** T-5, T-12

## Objetivo
Em prod, 2/2 agendamentos e 7/7 disponibilidades estão com `clinicId` nulo. Esta tarefa preenche esses registros e garante que as próximas escritas sempre gravem o tenant.

## Passos
1. `scripts/backfill-tenant-ids.cjs`:
   - dry-run por padrão;
   - agendamento recebe o tenant do profissional (ou do paciente); disponibilidade recebe o tenant do profissional;
   - idempotente.
2. Revisar todas as criações de `Appointment` e `TherapistAvailability` para gravar `clinicId`.
3. Preencher a clínica de pacientes com `clinicId` nulo (cadastro pelo app), que hoje recebem 409 ao criar avaliação — achado do code review da T-3.
4. Rodar em prod só com o push autorizado.

## Critérios de aceite
- [ ] Cenários da T-14 passando (local).
- [ ] Contagem de nulos local = 0.
