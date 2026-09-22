# T-13: Navegação — dar entrada às telas órfãs

**Status:** implementado (aguardando QA)
**Depende de:** nenhuma

## Objetivo
Tornar alcançáveis as telas que já existem no app e que o paciente não consegue abrir.

## Contexto
Achado da T-11. As tabs do módulo clínica são quatro — Home, Sessions, Exercises, Profile. A varredura de todo `router.push`/`href` em `mobile/app` e `mobile/src` encontrou **9 telas sem nenhuma referência**:

`consent`, `documents`, `guide`, `quizzes`, `tasks`, `treatment-protocol`, `assessment-progress`, `wearables`, `wearable-data`.

Mais duas com entrada degenerada:
- `screening` — só a partir de `guide`, que é inalcançável.
- `education` — só a partir da **home do BA One** (`(ba)/(tabs)/index.tsx:280`). O paciente precisa atravessar para outro produto.

É por isso que o inventário da T-1 errou: os arquivos existem, o acesso não. **Antes de portar tela nova, dar acesso às que já estão lá** — é o maior ganho por esforço desta atividade.

## Passos
1. Decidir a forma: menu no Profile, grid de acesso rápido na home (a web tem um), ou entradas contextuais. A web usa menu lateral curado — ver `lib/patient-sections.ts`.
2. Ligar as 9 telas órfãs.
3. Dar a `education` uma entrada dentro do módulo clínica, independente do BA.
4. Dar a `screening` entrada própria, não só via `guide`.
5. Não expor tela que a T-12 concluir que mente — coordenar com ela.

## Arquivos afetados
- `mobile/app/(app)/(clinica)/(tabs)/index.tsx`
- `mobile/app/(app)/(clinica)/(tabs)/profile.tsx`
- possivelmente `(tabs)/_layout.tsx`

## Critérios de aceite
- [ ] As 9 telas alcançáveis sem digitar URL
- [ ] `education` alcançável sem passar pelo BA One
- [ ] Nenhuma entrada para tela reprovada pela T-12
- [ ] Navegação conferida com paciente de teste, tela a tela
