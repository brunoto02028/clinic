# T-3: Termo genérico de treino para o aluno de estúdio

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
O aluno de estúdio aceita um termo de treino físico (PT/EN) com o nome do estúdio, e não o termo clínico da BPR.

## Contexto
Decisão 2 do Bruno. Rascunho a revisar (texto jurídico). O termo da BPR e a edição pelo SUPERADMIN não mudam.

## Passos
1. Texto padrão de treino em `lib/studio-terms.ts` (PT/EN, `{studio}` substituído).
2. `GET /api/admin/consent-texts` devolve o termo de treino quando quem pede é aluno de estúdio, ou quando vem `?studio=<slug>` de um estúdio (página `/join`).
3. A página `/join/<slug>` mostra/linka o termo do estúdio.

## Arquivos afetados
- `lib/studio-terms.ts` (novo)
- `app/api/admin/consent-texts/route.ts`
- `app/dashboard/consent/page.tsx`
- `components/auth/simplified-signup-form.tsx` (se o termo aparece no cadastro)

## Critérios de aceite
- [ ] Aluno de estúdio: `/dashboard/consent` com o termo de treino e o nome do estúdio (EN e PT), sem "clinical/treatment/Bruno Physical Rehabilitation".
- [ ] Paciente de clínica: termo da BPR igual.
