# T-2: O que você precisa, com quem, e quando

**Status:** pendente
**Depende de:** T-1

## Objetivo

O fluxo de marcar passa a perguntar na ordem em que a pessoa pensa.

## Contexto

Hoje a tela abre no preço e cai em Data/Hora. Quem chega ali ainda não escolheu
**o quê** nem **com quem** — e o calendário obriga a escolher um dia antes de
saber o que está marcando.

A ordem que o paciente usa é outra: *preciso de quê* → *com quem dá* → *quando*.
A 102 já tem as duas primeiras peças (modalidades e catálogo de profissionais);
elas estão numa tela separada (`Professionals`) que ninguém liga à de marcar.

## Passos

1. Um passo antes de tudo: **o que você precisa**. As opções saem do que a
   clínica tem — reabilitação, e as modalidades com profissional disponível.
   Modalidade sem ninguém disponível **não aparece**, em vez de aparecer e
   frustrar.
2. Escolhida a modalidade, **com quem** — o catálogo que já existe, com nome,
   registro, idiomas e **o preço de cada um**.
3. Só então **quando**, com a agenda daquele profissional, no fuso dele (já
   pronto na 102 T-4).
4. Voltar um passo não perde o anterior.
5. Quando só há uma resposta possível — a reabilitação, sem modalidades
   ligadas — o passo é pulado, em vez de pedir para escolher entre um.

## Arquivos afetados
- `mobile/app/(app)/(clinica)/book-appointment.tsx`
- `mobile/app/(app)/(clinica)/escolher-profissional.tsx`
- `app/api/patient/professionals/route.ts` (agrupar por modalidade)
- `__tests__/agenda/a-ordem-das-perguntas.test.ts`

## Critérios de aceite
- [ ] O primeiro passo é o quê, não quando.
- [ ] Modalidade sem profissional disponível não aparece.
- [ ] O preço aparece junto do nome, antes de escolher.
- [ ] Um passo com uma resposta só é pulado.
- [ ] Voltar preserva o que já foi escolhido.
