# T-3: Signup branded `/join/[slug]` com vocabulário estúdio/aluno

**Status:** pendente
**Depende de:** nenhuma (pode ir em paralelo com T-1)

## Objetivo
O cadastro branded (já existente) usar vocabulário e marca de estúdio/aluno para tenant personal.

## Contexto
D3/D4. `/join/[slug]` já resolve tenant e renderiza `SimplifiedSignupForm`. Auditar o que aparece hoje para tenant personal e ajustar wording ("Join \<Studio\> as a student"), branding e o link "Already have an account? → `/studio/[slug]`".

## Passos
1. Auditar `app/join/[slug]/page.tsx` + `components/auth/simplified-signup-form.tsx` para tenant personal.
2. Aplicar vocabulário estúdio/aluno e branding quando `type === PERSONAL_TRAINER`.
3. Link "Already have an account? Sign in" → `/studio/[slug]`.

## Arquivos afetados
- `app/join/[slug]/page.tsx`, `components/auth/simplified-signup-form.tsx`.

## Critérios de aceite
- [ ] `/join/<slug-personal>` mostra "student/studio" + marca; link para `/studio/[slug]`.
- [ ] Clínica (`/join/<slug-clinica>`) inalterada.
