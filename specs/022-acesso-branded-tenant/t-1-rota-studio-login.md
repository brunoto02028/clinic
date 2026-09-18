# T-1: Rota branded de login `/studio/[slug]`

**Status:** concluído (QA aprovado; review feito — testada junto com T-2)
**Depende de:** nenhuma

## Objetivo
Página de login própria do estúdio, resolvida por slug, personal-only, com marca e vocabulário de estúdio/trainer/aluno.

## Contexto
D1/D3/D4/D9. Reusa `resolveJoinTenant` (`lib/join-tenant.ts`). Renderiza um form de login (reuso de `login-form` com props branded, ou variante).

## Passos
1. `app/studio/[slug]/page.tsx` (server): resolve tenant pelo slug; **404** se inexistente/inativo ou `type !== PERSONAL_TRAINER`. Se já logado, redireciona por role.
2. Passar branding (name, primaryColor, secondaryColor, logo) e `slug` ao form.
3. Form branded com textos "Sign in to \<Studio\>", "Student Portal", "Trainer"/"Student" (sem depender de useVocab pós-login).
4. Link "Create your account" → `/join/[slug]`.

## Arquivos afetados
- `app/studio/[slug]/page.tsx`, `app/studio/[slug]/layout.tsx` (branding), `components/auth/*` (form branded ou props), possivelmente `lib/join-tenant.ts` (reuso).

## Critérios de aceite
- [ ] `/studio/<slug-personal>` renderiza login com marca + vocabulário de estúdio.
- [ ] `/studio/<slug-clinica>` e slug inexistente → 404.
- [ ] Já logado → redireciona por role.
