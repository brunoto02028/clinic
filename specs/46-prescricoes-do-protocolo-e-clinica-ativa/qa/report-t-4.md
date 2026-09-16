# QA — T-4: Teste `admin-sections-gating` alinhado ao commit 31435a0

**Resultado:** APROVADO
**Data:** 16/09/2026 · **Commit:** 097cf02

- `lib/admin-sections.ts:175` confirma que "treatments" é `clinicalOnly` desde 31435a0 (12/09) —
  o checkout dela cobra pela conta Stripe da clínica, não pelo Connect do personal.
- Teste atualizado: a aba **não** aparece para personal trainer e **aparece** para clínica; as
  outras asserções (exercises, list, challenges-list; sem notes/protocols/rehab-agent/equipment/
  screening) seguem iguais.
- `npx jest` → 31 suítes, 332 testes, nenhuma falha (antes: 1 falha antiga nesta suíte).
