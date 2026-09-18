# QA T-3 — Signup branded `/join/[slug]` (estúdio/aluno)

**Data:** 2026-09-11
**Ambiente:** dev local :4217, fixtures 2 tenants. Prod não tocada.
**Resultado:** ✅ **APROVADO**

## Evidência (Playwright)
- **Personal** `/join/qa-studio-pt`: cabeçalho "You're joining **QA Studio PT** as a student"; "Already have an account? Sign in" → **`/studio/qa-studio-pt`** (branded login). Cor do estúdio aplicada ao nome/link.
- **Clínica (regressão)** `/join/qa-clinic-a`: "You're joining **QA Clinic A**" (sem "as a student"); sign-in → **`/login`**. Idêntico ao anterior.

## Notas
- `app/join/[slug]/page.tsx` passa `isPersonal` (de `tenant.type`) e `primaryColor` (query escopada por tenant, só quando personal) ao form.
- `components/auth/simplified-signup-form.tsx`: wording + link condicionais; toque de marca via style inline (seguro).
- Review: **limpo** (nota opcional de eficiência: 2 queries no join personal — aceito).
- SiteHeader/footer do join permanecem o chrome público do site (fora do escopo do form).

## tsc
- Sem erros novos.

**Conclusão: APROVADO.**
