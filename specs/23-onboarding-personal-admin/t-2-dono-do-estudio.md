# T-2: Criar o dono do estúdio (trainer ADMIN)

**Status:** concluído (QA + review)
**Depende de:** T-1

## Objetivo
No mesmo fluxo de criação do estúdio, criar a conta do trainer (role ADMIN) nesse tenant, para ele conseguir entrar.

## Contexto
Reusa o mecanismo de `POST /api/admin/users` (SUPERADMIN pode passar `targetClinicId` + `role`; gera senha temporária e envia e-mail com link `/staff-login`).

## Passos
1. Form: campos do dono — firstName, lastName, email (opcional: senha temporária gerada automaticamente).
2. Backend (SUPERADMIN): após criar o clinic, criar o `User` ADMIN com `targetClinicId` = novo clinic; disparar o e-mail existente (senha temp + staff-login).
3. Idempotência/validação: e-mail já existente → erro claro; se a criação do user falhar, reportar (o clinic já criado permanece — informar).

## Arquivos afetados
- `app/admin/clinics/page.tsx` (campos do dono), `app/api/admin/clinics/route.ts` (compõe a criação) ou um endpoint dedicado de provisionamento.

## Critérios de aceite
- [ ] Após criar o estúdio, existe um `User` role=ADMIN no tenant, que loga em `/staff-login`.
- [ ] Trainer logado cai em `/admin` personalizado (personal) e vê "Your studio links".
- [ ] E-mail duplicado → erro tratado; clinic sem dono não fica "órfão" silenciosamente.
