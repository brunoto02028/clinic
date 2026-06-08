# T-5: Exercícios prescritos — lista + detalhe

**Status:** pendente
**Depende de:** T-1, T-2

## Objetivo
Tela de exercícios prescritos ao paciente: lista e detalhe (instruções, séries/reps,
mídia se houver).

## Passos
1. Confirmar a fonte: `GET /api/exercises` e/ou prescrições do paciente
   (modelos `ExercisePrescription`/`Exercise`). Ajustar query conforme o que a API expõe.
2. Lista de exercícios prescritos com card (nome, séries/reps).
3. Detalhe: descrição, instruções, vídeo/imagem se disponível.
4. Estados loading/erro/vazio.

## Arquivos afetados
- `mobile/app/(app)/(tabs)/exercises.tsx`
- `mobile/app/(app)/exercise/[id].tsx` (detalhe)
- `mobile/src/api/exercises.ts`

## Critérios de aceite
- [ ] Lista exibe exercícios prescritos reais.
- [ ] Detalhe mostra instruções do exercício.
- [ ] Estado vazio coerente.
- [ ] Mídia (se houver) renderiza ou degrada com elegância.
