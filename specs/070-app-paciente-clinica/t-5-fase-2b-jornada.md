# T-5: Fase 2B — Jornada BPR

**Status:** pendente
**Depende de:** T-1

## Objetivo
Levar ao app a Jornada BPR e o que pende dela.

## Contexto
A T-1 corrigiu uma suspeita do plano original: eu achava que `achievements`, `community` e `journey` fossem do produto do personal e que esta tarefa fosse encolher. É o inverso — as três estão em `CLINICAL_PATIENT_KEYS` (`components/dashboard/patient-sidebar.tsx`), ou seja, são escondidas do aluno **por serem da clínica**. As atividades 058 e 059 tiraram Jornada e Comunidade do aluno justamente por isso.

| Tela | Endpoint |
|---|---|
| `journey` | `/api/patient/journey`, `/api/dashboard/evolution` |
| `quiz` | `/api/patient/journey/quiz` |
| `achievements` | `/api/patient/achievements` |
| `community` | `/api/patient/journey/community` |

⚠️ `quiz` **não** é o `quizzes` educativo que o app já tem. É o quiz de arquétipo da Jornada, que segundo o comentário do sidebar leva à loja da BPR. São telas diferentes — não fundir.

## Passos
1. Portar `journey` primeiro — as outras três penduram nela.
2. `community`: o feed é alimentado pelos "wins" da Jornada (ativ. 059). Conferir o comportamento com feed vazio.
3. `achievements`: **não** reaproveitar a tela de `achievements` do módulo BA — público e dados diferentes.
4. `quiz`: manter separado de `quizzes.tsx`, com navegação que não confunda os dois.

## Arquivos afetados
- `mobile/src/api/*.ts`
- `mobile/app/(app)/(clinica)/*.tsx`

## Critérios de aceite
- [ ] Jornada mostra os mesmos marcos e progresso da web
- [ ] `quiz` e `quizzes` coexistem sem confusão de navegação
- [ ] Nenhuma tela do módulo BA reaproveitada
- [ ] Comunidade trata feed vazio
