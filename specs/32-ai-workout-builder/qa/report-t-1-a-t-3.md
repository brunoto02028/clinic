# QA Report — Atividade 32 (AI Workout Builder) — T-1/T-2/T-3

**Data:** 2026-09-11 · `next dev` local, `bpr_clinic_local`. Prod intocada. en-GB. Fixtures 3 tenants (personal c/catálogo, personal sem catálogo, clínica), removidas ao final. **Custo de IA: 2 chamadas reais** (dentro do orçamento de 2-3); todos os cenários de erro (400/401/404/429) confirmados **sem** chamar a IA.

**Resultado: ✅ APROVADO — 12/12 cenários PASS.**

| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | Happy path (foco "legs") — exerciseIds batem com o catálogo real; 0 Workout/WorkoutExercise criados | ✅ |
| 2 | Exercício sem vídeo nunca aparece no catálogo enviado/gerado | ✅ |
| 3 | Catálogo vazio → 400 antes de chamar IA | ✅ |
| 4a | Sem sessão → bloqueado (307 do middleware, comportamento global pré-existente) | ✅ |
| 4b | studentId de outro tenant → 404 | ✅ |
| 4c | Tenant CLINIC sem TRAINING → 404 | ✅ |
| 5 | Rate limit 20/24h → 429 após a 20ª chamada; confirmado que dispara ANTES da IA (chamadas em <100ms) | ✅ |
| 6 | UI: gerar → editar → Save cria Workout real com os exercícios corretos | ✅ |
| 6b | Fallback de foco (G-2) exibido na UI quando nada casa | ✅ (bônus) |
| 7 | Regenerar com rows preenchidas pede confirmação (guard cobre nome OU rows — M1) | ✅ |
| 8 | Regressão: fluxo manual (sem IA) idêntico; console limpo | ✅ |
| 9 | Gating: CLINIC sem aba/builder de Workouts (convenção pré-existente) | ✅ |

## Destaques verificados no banco
- **Anti-alucinação:** os exerciseIds retornados batem 100% com os IDs reais da fixture; nenhum id fora do catálogo.
- **Sem persistência na geração:** `Workout`/`WorkoutExercise` = 0 antes e depois da chamada de geração; só o Save (POST normal) cria linhas.
- **Rate limit antes do custo:** 21 chamadas ao catálogo vazio resolveram em <100ms cada (vs. ~15-20s das chamadas reais de IA) — `rateLimit()` roda antes de `callAI`.

## Code review (fork) — sólido, sem HIGH
Isolamento (catálogo só do tenant, nunca do cliente), rate-limit-antes-do-custo, timeout com cleanup correto, truncamento tratado (nunca vaza texto cru), prompt proíbe loadKg — todos confirmados. **Aplicados após o QA** (não invalidam os cenários testados, são aditivos):
- **M1:** guard de confirmação ao regenerar agora cobre nome digitado manualmente, não só rows.
- **B1:** form de geração reseta após sucesso (evita reusar goal/focus de uma geração anterior).
- **B2:** o aviso de fallback captura o `focus` usado na chamada, não a referência ao state ao vivo.
- **M2:** `daysPerWeek` clampado 1-7 no servidor.

## Notas (não bloqueiam)
- Sem sessão responde 307/redirect (middleware), não 401 JSON — padrão de toda `/api/admin/*`, não específico desta rota.
- 2 erros de console pré-existentes e não relacionados (`/api/version` e `/api/admin/pending-count` 404) em qualquer página admin — fora de escopo.

**Screenshots:** `specs/32-ai-workout-builder/qa/screenshots/`.
