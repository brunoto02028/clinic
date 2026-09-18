# QA Report — T-7: Suíte automatizada de isolamento

**Data:** 2026-09-10
**Resultado:** ✅ **APROVADO**

## O que é
`tests/tenant-isolation/run.cjs`, rodável por `npm run test:tenants`. Sobe os fixtures de dois tenants, loga como cada ator por HTTP (passando por middleware e sessão reais), roda os cenários canônicos de isolamento, limpa e sai com código ≠ 0 se qualquer um vazar. Assume um dev server local (`TENANT_TEST_URL`, padrão `http://localhost:4192`).

## Cenários cobertos (T-3 a T-6)
ISO-1 (prontuário de outro tenant → 404), ISO-2 (lista de pacientes escopada), ISO-3 (profissionais escopados), ISO-4 (disponibilidade de outro tenant → 404), ISO-5 (agendar com profissional de outro tenant → 404), ISO-7 (paciente lê avaliação de outro pela rota de admin → 403/404), ISO-8b (paciente por `/api/patients/[id]` → 404), ISO-9 (delete cross-tenant → 404, registro intacto), ISO-11 (exercícios escopados), X1 (`viewAll` escopado), IMP (cookie de impersonação forjado não vale para admin de outro tenant).

## Evidência
- **Rodada positiva:** `11/11 passed. No cross-tenant leaks.` exit 0.
- **Rodada negativa (prova de que a suíte pega regressão):** revertido o filtro `clinicId` de `/api/therapists` → a suíte marcou **`FAIL ISO-3`** e **`LEAKS: ISO-3`**; guard restaurado em seguida e a suíte voltou a 11/11.

## Antes do push
Rodar `npm run test:tenants` contra um dev server local (com `DEFAULT_CLINIC_SLUG` definido) faz parte da checagem pré-push desta atividade.
