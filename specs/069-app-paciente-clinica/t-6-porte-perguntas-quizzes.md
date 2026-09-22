# T-6: Porte — perguntas e quizzes

**Status:** pendente
**Depende de:** T-1

## Objetivo
Completar a parte de interação pergunta/resposta do paciente no app.

## Contexto
Agrupamento provisório, confirmado pela T-1.

Candidatas: `questions`, `quiz`. O app já tem `quizzes.tsx`; a web tem `quiz` **e** `quizzes` — esclarecer na T-1 se são telas diferentes (lista × execução) ou duplicação histórica.

## Passos
1. Esclarecer a relação `quiz` × `quizzes` e o que o app já cobre.
2. Portar o que faltar, reaproveitando a tela existente quando for só lista × detalhe.
3. `questions`: canal de perguntas ao terapeuta — conferir se há envio e como a resposta chega.

## Arquivos afetados
- `mobile/src/api/*.ts`
- `mobile/app/(app)/(clinica)/quizzes.tsx` (possível extensão)
- `mobile/app/(app)/(clinica)/*.tsx` (telas novas)

## Critérios de aceite
- [ ] Relação `quiz`/`quizzes` documentada; sem tela duplicada no app
- [ ] Paciente consegue responder e ver o que já respondeu
- [ ] Envio de pergunta (se existir) funciona e trata erro
