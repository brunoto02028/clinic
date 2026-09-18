# T-2: UI (Generate with AI)

**Status:** concluído
**Depende de:** T-1

## Objetivo
Botão no `WorkoutBuilder` que abre um mini-form, chama a geração, e popula as `rows` de edição já existentes — o "Save" continua sendo o fluxo manual normal.

## Passos
1. `components/workouts/workout-builder.tsx`: botão "Generate with AI" (ícone sparkles) perto de "Add exercise"/topo do form.
2. Dialog/painel: campos objetivo (texto livre curto), nível (beginner/intermediate/advanced), dias/semana (não usado pra gerar N treinos — só contextual), foco (texto livre: "upper body", "legs", "full body"…), observações.
3. Ao gerar: `POST /api/admin/workouts/ai-generate` com `{studentId, goal, level, daysPerWeek, focus, notes}` → loading (com estado de erro em caso de demora/timeout — nunca spinner infinito) → em sucesso, preenche `name` e `rows` diretamente (o retorno já vem no shape `WEx` flat — sem mapeamento/2ª chamada); se `usedFallbackCatalog:true`, mostra um aviso "no exercises matched '{focus}' — using your full library"; fecha o dialog; o personal vê exatamente a mesma UI de edição manual, já populada.
4. Erros (400/429/502/504) exibidos no dialog com mensagem clara; não fecha o form. **Regenerar é tudo-ou-nada (G-5, limitação conhecida do v1)**: se já há rows preenchidas (geradas ou editadas manualmente), confirma antes de **substituir todas** — sem merge parcial.

## Arquivos afetados
- `components/workouts/workout-builder.tsx`

## Critérios de aceite
- [ ] Gerar preenche nome+exercícios editáveis na UI existente; nada é salvo até clicar "Save" (fluxo normal).
- [ ] Erros da API aparecem no dialog sem quebrar o form.
- [ ] Regenerar com rows já preenchidas pede confirmação antes de sobrescrever.
