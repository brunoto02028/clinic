# QA - atividade 078

## T-1 - prescrever libera

| tipo | cenario | esperado |
|---|---|---|
| API | paciente sem pacote/plano, com prescricao ativa | `mod_exercises` presente em `/api/patient/access` |
| API | mesma prescricao desativada (`isActive: false`) | modulo **ausente** |
| API | override `hidden` + prescricao ativa | modulo **ausente** (override vence) |
| API | paciente com prescricao: `GET /api/patient/exercise-submissions` | 200, nao 403 |
| API | paciente sem nada | 403 `module_not_in_plan`, como antes |
| API | prescricao de **outra** clinica | nao libera |
| API | nenhum outro modulo entra junto | lista de modulos identica exceto `mod_exercises` |

## T-2 - textos

| tipo | cenario | esperado |
|---|---|---|
| UI | sem modulo | texto sem "plano" no sentido de assinatura |
| UI | com modulo, sem prescricao | explica o que vem a seguir |
| UI | botao "Falar com a clinica" | abre a conversa |
| UI | EN e PT | ingles primeiro, os dois revisados |

## T-3 - a clinica ve

| tipo | cenario | esperado |
|---|---|---|
| API | paciente sem prescricao | entra na contagem |
| API | depois de prescrever | sai da contagem |
| API | e-mail do resumo | contagem e link, **nenhum nome** |
| API | paciente de outra clinica | nao entra |
| UI | badge do menu | soma o novo contador |

## Fora de alcance sem aparelho
As telas da T-2 no iPhone. O texto pode ser conferido no Expo Web; o comportamento do toque, nao.
