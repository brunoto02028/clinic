# T-8: Biblioteca vazia com orientação

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Personal novo entende como montar a biblioteca, e a IA de treino explica o que falta, em vez de um erro seco.

## Contexto
Decisão 1 do Bruno (não copiar a biblioteca da BPR).

## Passos
1. Estado vazio na biblioteca de exercícios do personal com o passo a passo (Add Exercise / Bulk Upload, vídeo obrigatório para a IA).
2. No builder, quando a IA recusa por falta de exercícios com vídeo: mensagem clara + link para a biblioteca.

## Arquivos afetados
- tela da biblioteca de exercícios
- `components/workouts/workout-builder.tsx`

## Critérios de aceite
- [ ] Estúdio sem exercícios com vídeo: biblioteca mostra orientação; "Generate with AI" mostra mensagem com link.
