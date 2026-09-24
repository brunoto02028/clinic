# T-2: Para onde vai quem acabou de se cadastrar

**Status:** pendente · **Depende de:** T-1

## Objetivo
Que a primeira tela depois do cadastro seja a avaliação, e não uma home vazia de erros.

## Contexto
A conta nova nasce sem `consentAcceptedAt`, de propósito. Com o gate da 074, quase toda rota
responde `403 consent_required`. Hoje o login manda todo mundo para `/(app)/module-select`, e o
paciente novo veria cartões de erro em sequência. O aceite é a última etapa da avaliação.

## Passos
1. Depois de registrar, levar direto para `/(app)/(clinica)/screening`.
2. Em quem já está logado, usar `access.onboarding` (`/api/patient/access` é rota de bypass,
   sempre responde) para mostrar, na home, um cartão único "complete sua avaliação" em vez de
   vários erros.
3. Conferir que o cartão de consentimento do `LoadFailure` (074) não aparece duplicado com esse.

## Arquivos afetados
- `mobile/app/register.tsx`, `mobile/app/(app)/(clinica)/(tabs)/index.tsx`

## Critérios de aceite
- [ ] Recém-cadastrado cai na avaliação, não na home
- [ ] Home de quem não terminou mostra **um** convite, não uma pilha de erros
- [ ] Depois do aceite, a home carrega normalmente
