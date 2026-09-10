# T-5: Agenda

**Status:** pendente
**Trilha:** PLATAFORMA
**Depende de:** T-2

## Objetivo
Fechar A1 e C4: hoje o aluno vê e agenda profissionais de outros tenants; sem profissional escolhido, cai num admin não reservável; o agendamento sai sem `clinicId`; e o `viewAll` lista a agenda de todos. Confirmado nos ISO-3 a ISO-6, X1 e AL-3.

## Passos
1. `app/api/therapists`: só profissionais reserváveis do tenant do ator.
2. `app/api/availability`:
   - valida o profissional no tenant;
   - substitui o fallback "primeiro da plataforma" pelo profissional reservável do tenant;
   - entra no `MOBILE_API_PREFIXES` do `middleware.ts`, para o app conseguir consultar (hoje devolve 307).
3. `app/api/appointments` (POST):
   - valida profissional e paciente no mesmo tenant;
   - o fallback só escolhe profissional `bookable` do tenant;
   - grava `clinicId`.
4. `app/api/appointments` (GET): o `viewAll` fica restrito ao tenant.
5. `app/api/appointments/[id]/reschedule` e `app/api/admin/availability`.
6. `app/api/public/schedule`: tenant padrão, ou `?clinic=<slug>` para um tenant específico.

## Critérios de aceite
- [ ] Cenários da T-5 passando.
- [ ] Regressão: o paciente da BPR agenda com o Bruno normalmente, e o `clinicId` é gravado.
