# T-3: A bifurcação do cadastro e o perfil do laboratório

**Status:** implementada · revisada · QA pendente
**Depende de:** T-2

## Objetivo

O cadastro pergunta o que a pessoa veio fazer, e o perfil pede só o que o exame exige.

## Contexto

Decisões 4 e 5 do plano. O cadastro mandava **todo mundo** para a triagem clínica: quem queria
vitamina D era perguntado sobre dor noturna, histórico de câncer e função da bexiga.

## Passos (feitos)

1. `mobile/app/(app)/welcome-choice.tsx` — três portas: comprar exame, virar paciente da clínica,
   só olhar. Chama `setIntent()` e invalida `["modules"]`.
2. `app/api/patient/intent/route.ts` — `intent: "lab" | "clinic"`; `clinic` põe
   `isClinicPatient: true` (só na transição `false → true`, nunca de volta).
3. `mobile/app/register.tsx` — passa a levar a `/(app)/welcome-choice` em vez de
   `/(app)/(clinica)/screening`.
4. `mobile/app/(app)/profile-setup.tsx` — data de nascimento, sexo biológico, telefone e endereço
   de entrega, cada um com a sua frase de porquê, mais um "pular".
5. `app/api/patient/profile/route.ts` — passou a aceitar `sex`, que faltava (sem ele metade das
   faixas de referência sai errada).
6. `mobile/app/(app)/(lab)/(tabs)/profile.tsx` — menu de quem é só laboratório: "My orders" e
   "Terms & privacy", sem nada da clínica.

## Arquivos afetados

- `mobile/app/(app)/welcome-choice.tsx`, `profile-setup.tsx` (novos)
- `mobile/app/register.tsx`, `mobile/src/api/onboarding.ts` (novo)
- `app/api/patient/intent/route.ts` (novo), `app/api/patient/profile/route.ts`
- `mobile/app/(app)/(lab)/(tabs)/profile.tsx`
- `__tests__/labs/onboarding-fork.test.ts`, `patient-shape.test.ts`

## Critérios de aceite

- [x] O cadastro não leva mais à triagem clínica (teste reprova a volta da rota antiga)
- [x] Escolher "clínica" marca `isClinicPatient`
- [x] Escolher "exame" não marca
- [x] `intent` nunca desmarca quem já é paciente
- [x] O perfil aceita e grava `sex`
- [x] Cada campo do perfil diz para que serve, e há como pular
- [x] O menu de quem é só laboratório não tem entrada da clínica
- [ ] **QA:** as três portas percorridas em produção com conta de teste nova
