# T-15: Gestão de tenants (SUPERADMIN) + limites do plano

**Status:** pendente
**Trilha:** PLATAFORMA
**Depende de:** T-12

## Objetivo
O SUPERADMIN cria e administra tenants, e os limites do plano SaaS passam a valer (achado A6).

## Passos
1. Tela de tenants (usa `app/admin/clinics` e `/api/admin/clinics`, restritos a SUPERADMIN):
   - criar com tipo, admin inicial (convite), módulos e plano;
   - ativar ou desativar.
2. Aplicar `Subscription.maxPatients` e `maxTherapists` na criação de paciente, aluno e staff, com mensagem clara.

## Critérios de aceite
- [ ] Cenários da T-15 passando.
