# T-1: Sessão do superadmin reflete o tenant selecionado

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Para SUPERADMIN, `session.user.clinicName`, `clinicSlug`, `clinicType`, `clinicLogoUrl` e `clinicPrimaryColor` vêm do tenant selecionado (cookie `selected-clinic-id`). Sem seleção, vêm do próprio tenant.

## Passos
1. `lib/auth-options.ts` (callback `jwt`): se `token.role === "SUPERADMIN"`, ler o cookie `selected-clinic-id` via `next/headers`, protegido por try, porque fora de um request não há cookies. O id efetivo é o do cookie ou `token.clinicId`. Se ele difere de `token.viewClinicId`, carregar `name`, `slug`, `type`, `logoUrl` e `primaryColor` e gravar nos campos de exibição e em `token.viewClinicId`.
2. Não mexer em `token.clinicId`, `role` nem `permissions`.
3. O refresh da ativ. 52 (`trigger === "update"`, branding) continua funcionando: para o superadmin, ele relê o tenant efetivo.

## Arquivos afetados
- `lib/auth-options.ts`

## Critérios de aceite
- [ ] Superadmin com `qa-studio-pt` selecionado: `/api/auth/session` traz `clinicType: PERSONAL_TRAINER` e `clinicName: "QA Studio PT"`. O `/admin` mostra "Studio", halteres e o menu do personal.
- [ ] Sem seleção, ou com a BPR selecionada: a sessão fica igual a hoje.
- [ ] Personal, aluno, admin e fisio de clínica: sessão idêntica à de antes.
- [ ] Um cookie apontando para um id inexistente não quebra a sessão: cai no próprio tenant.
