# T-1: API de geração

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Rota que gera um rascunho de treino por IA a partir do catálogo do tenant, sem persistir nada.

## Contexto
Mirror de `app/api/admin/education/ai-generate/route.ts` (retorna `{ generated }`, não salva). Guardas: `assertTrainingAccess`, `assertPatientAccess`, `assertExercisesInTenant`. `callAI`/`parseAIJson` de `lib/ai-provider.ts` (jsonMode é no-op — parse defensivo obrigatório).

## Passos
1. `lib/workout-ai.ts`:
   - `buildCatalogForPrompt(exercises, focus?, cap=60)` — filtra/prioriza (bodyRegion/tags batendo com `focus`) e limita ao cap. **(G-2) Se o filtro por `focus` não achar nada, cai para o catálogo geral (não filtrado) e marca `usedFallback=true`** (retornado junto pro caller sinalizar na resposta). Formata `id|name|bodyRegion|tags|difficulty|defaultSets/Reps/Rest` por linha.
   - `buildWorkoutPrompt({goal, level, daysPerWeek, focus, notes}, catalogText)` — system prompt com o schema JSON exato esperado e a regra "só use IDs da lista; NUNCA invente um exercício que não está nela".
   - `validateGeneratedWorkout(raw, exerciseById: Map<id, Exercise>)` — parse defensivo (`parseAIJson`), valida shape (name string; exercises array; cada item com `exerciseId` ∈ `exerciseById`, sets/reps numéricos ou null); **descarta** silenciosamente exerciseId fora do map; retorna erro se sobrar 0 exercícios. **(G-3) Preenche campos omitidos pela IA com os defaults do próprio Exercise** (`defaultSets`→sets, `defaultReps`→repsMax, `defaultRestSec`→restSeconds) antes de devolver. **(G-4) Monta cada item no shape FLAT que `WEx` espera**: `{exerciseId, name, videoUrl, sets, repsMin, repsMax, loadKg:null, rpe:null, rir:null, cadence:null, restSeconds, notes:null}` — nunca `{exercise:{...}}` aninhado.
2. `app/api/admin/workouts/ai-generate/route.ts` (POST):
   - `getActor` → `assertTrainingAccess` → `assertPatientAccess(actor, studentId)`.
   - Rate limit: `rateLimit(\`ai-workout:${clinicId}\`, {max:20, windowMs:24*60*60*1000})` → 429 se estourar.
   - Busca exercícios do tenant `isActive:true, videoUrl:{not:null}` — vazio → 400 "add exercises with video first".
   - Monta prompt, chama `callAI(prompt, {systemPrompt, temperature:0.6, maxTokens:4096})` **(G-1b: 4096, não 1500 — evita truncar o JSON)**, **(G-6) envolvida em timeout ~30s** (`Promise.race` com um reject por timeout, ou `AbortSignal.timeout` se o provider suportar) → estourou o tempo → 504 "AI is taking too long, try again."
   - Valida com `validateGeneratedWorkout`; **truncamento/JSON incompleto é tratado como erro de parse** (não crash) → 502 "AI generated invalid data, try again." (nunca vaza o texto cru da IA ao client; loga server-side).
   - Sucesso → `200 { generated: { name, phase?, daysOfWeek?, exercises: [...] }, usedFallbackCatalog?: boolean }` — shape dos `exercises[]` **flat**, pronto pra virar `rows` do builder sem outra chamada nem mapeamento.

## Arquivos afetados
- `lib/workout-ai.ts` (novo)
- `app/api/admin/workouts/ai-generate/route.ts` (novo)

## Critérios de aceite
- [ ] Happy path retorna `generated` com só exerciseIds do catálogo do tenant, no shape **flat** (`WEx`-compatível); nada é persistido (0 `Workout`/`WorkoutExercise` criados).
- [ ] Catálogo vazio (sem exercício ativo c/ vídeo) → 400 claro.
- [ ] exerciseId alucinado (fora do enviado) é descartado; se sobrar 0 → erro pedindo regenerar.
- [ ] Campos omitidos pela IA (sets/reps/rest) são preenchidos com os defaults do Exercise.
- [ ] Foco sem match → cai pro catálogo geral e `usedFallbackCatalog:true` na resposta.
- [ ] Timeout do provider (~30s) → 504 claro, não trava a request.
- [ ] JSON truncado (maxTokens estourado) → 502 tratado, não crash.
- [ ] Rate limit 429 após o teto; sem sessão 401; studentId de outro tenant 404; tenant CLINIC sem TRAINING → 404 (gate).
