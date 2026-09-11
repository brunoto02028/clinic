# T-2: Auth escopada por tenant no login branded

**Status:** concluído (QA aprovado; review feito — open-redirect callbackUrl corrigido)
**Depende de:** T-1

## Objetivo
Garantir que só usuários **daquele** tenant entrem pelo link do estúdio; redirect por role.

## Contexto
D2/D5. Credenciais são validadas globalmente (`lib/auth-credentials.ts`); precisamos verificar `clinicId` contra o tenant do slug **após** autenticar.

## Passos
1. Após sucesso de credenciais no `/studio/[slug]`, comparar `session.user.clinicId` (ou token) com o `tenant.id` do slug.
2. Mismatch (e não SUPERADMIN) → **rejeitar** com mensagem ("This account isn't part of \<Studio\>") e **não** prosseguir; oferecer link para o `/login` genérico.
3. Sucesso: role ADMIN/THERAPIST → `/admin`; PATIENT → `/dashboard`; preservar `callbackUrl`.

## Arquivos afetados
- `components/auth/*` (submit handler branded), possivelmente `app/studio/[slug]/page.tsx`.

## Critérios de aceite
- [ ] Aluno/trainer do tenant → entra e cai na área certa por role.
- [ ] Usuário de OUTRO tenant → rejeitado com mensagem, sem entrar.
- [ ] SUPERADMIN não é bloqueado.
