# T-4: Onboarding do aluno de estúdio sem triagem médica

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Nada no fluxo do aluno de estúdio pede "medical screening" (passo pendente na ficha, lembrete, onboarding do dashboard).

## Contexto
Achado P5. Triagem é rota bloqueada para o estúdio (ativ. 20/52).

## Passos
1. `lib/onboarding-reminder.ts` e a API `onboarding-pending`: aluno de estúdio nunca tem `screeningMissing`.
2. Onboarding do dashboard do aluno: sem passo de triagem.

## Arquivos afetados
- `lib/onboarding-reminder.ts`
- `app/api/admin/patients/[id]/onboarding-pending/route.ts`
- componentes de onboarding do aluno

## Critérios de aceite
- [ ] Ficha do aluno (Summary) e Preview do lembrete sem "Submit medical screening".
- [ ] Paciente de clínica sem triagem: continua pendente.
