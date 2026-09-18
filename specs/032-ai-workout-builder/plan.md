# Atividade 32 — AI Workout Builder

## Objetivo
O personal gera um treino automaticamente por IA (objetivo, nível, dias/semana, foco) usando **só exercícios que já existem no catálogo do tenant** (com vídeo), revisa/edita o rascunho, e salva pelo fluxo normal de criar treino (sem persistência nova). Cobre o gap "AI Workout Builder" do Everfit. Gate TRAINING (mesmo do resto de treino/nutrição). Sem modelo novo no banco.

## Situação atual (do scan)
- `POST /api/admin/workouts` já aceita `{name, studentId, exercises:[{exerciseId, sets, repsMin, repsMax, loadKg, rpe, rir, cadence, restSeconds, ...}]}` — é o alvo do "Save".
- `Exercise` (por tenant): name/namePt, bodyRegion, difficulty, tags, videoUrl, defaults de sets/reps/rest. Sem muscleGroup/equipment dedicados.
- Padrão a copiar: `app/api/admin/education/ai-generate/route.ts` — a rota NÃO persiste; devolve `{ generated }`, o admin revisa, e um POST normal (endpoint já existente) salva.
- `callAI`/`parseAIJson` (lib/ai-provider.ts) — **`jsonMode` é um no-op hoje** (não força JSON via API); só prompt engineering + parse defensivo. Usar `parseAIJson` com try/catch.
- Guardas a reusar: `assertTrainingAccess`, `assertPatientAccess`, `assertExercisesInTenant` (garante que a IA não "alucinou" um exerciseId de outro tenant/inexistente).
- Sem infra de rate-limit de IA — precedente é `rateLimit()` inline na própria rota (como em `admin/settings/generate-image`).

## Decisões de design
- **Sem persistência na geração**: `POST /api/admin/workouts/ai-generate` retorna `{ generated }` (rascunho), nunca cria `Workout`. O "Save" reusa o `POST /api/admin/workouts` já existente e testado — zero risco novo de dado.
- **Catálogo fechado**: o prompt recebe só os exercícios `isActive:true, videoUrl not null` do tenant (id+name+bodyRegion+tags+difficulty+defaults). Instrução explícita "só use IDs desta lista; nunca invente um exercício". **Validação server-side**: todo `exerciseId` retornado é conferido contra o **subconjunto enviado no prompt** (não o catálogo inteiro) — qualquer id fora disso é descartado; se sobrar 0 exercícios válidos, erro pedindo para tentar de novo.
- **Catálogo vazio → erro cedo**: sem exercícios ativos com vídeo, a rota recusa antes de chamar a IA ("adicione exercícios com vídeo à sua biblioteca primeiro").
- **Um treino por chamada** (não um split semanal inteiro) — mais simples e seguro; o personal clica "Generate" de novo para montar outros dias do split. Split completo = backlog.
- **Tamanho do catálogo enviado ao prompt**: cap (ex.: 60 exercícios) para não estourar tokens/custo — se o tenant tiver mais, prioriza por `bodyRegion`/`tags` batendo com o foco informado, senão os mais recentes/ativos.
- **Rate limit inline**: `rateLimit(`ai-workout:${clinicId}`, {max: 20, windowMs: 24h})` — generoso pro uso real, limita custo de abuso. **(G-1a) Escopo explícito: por CLINIC, não por trainer** — um estúdio com vários trainers compartilha o teto. Aceitável no v1 (maioria dos tenants personal tem 1 trainer); ajustável depois.
- **UI**: dentro do `WorkoutBuilder` existente — botão "Generate with AI" abre um mini-form (objetivo, nível, dias/semana, foco/observações) → chama a rota → popula as `rows` do builder (mesma UI de edição manual) → o personal ajusta e clica "Save" (fluxo normal, inalterado).
- **Gate**: igual ao resto de treino — `assertTrainingAccess`/TRAINING (personal por padrão; convenção já estabelecida no projeto que isso é TRAINING-gated, não um flag de tenant-type).
- **(G-4, ALTA) Shape do exercício embutido = FLAT, igual ao `WEx` do builder**: o builder usa `{exerciseId, name?, videoUrl?, sets, repsMin, repsMax, loadKg, rpe, rir, cadence, restSeconds, ...}` **flat** (não `{exerciseId, exercise:{name,videoUrl}}` aninhado, que é o shape do GET de Workout). A rota de geração devolve exatamente o shape flat que `WEx` espera, para a UI popular as rows sem 2ª chamada nem mapeamento arriscado.
- **(G-6, ALTA) Timeout explícito na chamada de IA**: nenhum provider em `lib/ai-provider.ts`/`lib/claude.ts` tem timeout hoje — sem isso, a rota (e a UI) trava indefinidamente se o provedor pendurar. A rota envolve `callAI` com timeout (~30s) e responde 504/502 claro se estourar; a UI trata isso como erro exibível, nunca spinner infinito.
- **(G-1b, ALTA) `maxTokens` mais folgado**: 1500 é curto demais para um treino de 8-10 exercícios com todos os campos — risco real de truncar o JSON no meio (parse falha). Usar **4096** (mesmo default de `education/ai-generate`); truncamento tratado como erro de parse → 502 "tente de novo" (nunca crash).
- **(G-2, MÉDIA) Fallback quando o foco não casa com nada**: se o filtro por `focus` não encontrar exercício nenhum, cai para o catálogo geral do tenant e a resposta sinaliza `usedFallbackCatalog: true` — a UI avisa "no exercises matched '{focus}' — using your full library" (nunca falha silenciosamente com um treino fora do pedido).
- **(G-3, MÉDIA) Defaults do exercício como fallback**: quando a IA omite `sets`/`repsMax`/`restSeconds` etc., `validateGeneratedWorkout` preenche com `defaultSets`/`defaultReps`/`defaultRestSec` do próprio `Exercise` antes de devolver — evita rows vazias sem necessidade.
- **(G-5, MÉDIA) Regenerar é tudo-ou-nada**: confirma e **substitui todas as rows** — sem merge parcial com edição manual já feita. Limitação conhecida do v1 (declarada, não corrigida agora).

## Tarefas
| T-N | Nome | Escopo | Status |
|-----|------|--------|--------|
| T-1 | API de geração | `lib/workout-ai.ts` (prompt+validação) + `POST /api/admin/workouts/ai-generate`; rate limit; catálogo fechado + validação anti-alucinação | concluído |
| T-2 | UI | botão "Generate with AI" no `WorkoutBuilder` + mini-form + popular rows a partir do rascunho | concluído |
| T-3 | Gating + regressão | TRAINING gate; sem persistência indevida; fluxo manual do builder intacto; clínica sem vazamento | concluído |

## Suposições (validar)
1. **Um treino por geração** (não split semanal completo). OK pra v1?
2. **Cap de catálogo enviado à IA** (~60 exercícios, priorizado por foco; fallback pro catálogo geral se o foco não achar nada). Ajusto o número se quiser.
3. **Rate limit 20 gerações/24h por CLINIC** (não por trainer individual — G-1a). Ajustável.
4. **Sem tracking de custo/uso persistido** (sem model novo) — não existe isso em nenhum lugar do app hoje; adotamos a mesma convenção (rate limit inline, sem contabilidade).
5. **IA não decide peso/carga real** (loadKg fica null/a critério do personal) — a IA sugere sets/reps/rest/cadence; carga é individual demais para adivinhar. Confirmar.
6. **Regenerar é tudo-ou-nada** (G-5): substitui todas as rows, sem merge com edição manual já feita. Limitação conhecida do v1.

## Backlog declarado
- Gerar o split semanal completo de uma vez; considerar histórico de treino do aluno (progressão) no prompt; ajuste automático de carga por 1RM estimado (já existe cálculo de 1RM — poderia alimentar o prompt no futuro).

## QA
`qa/qa-spec.md` — unit do builder de prompt/validação anti-alucinação; API happy path + catálogo vazio + rate limit + exerciseId alucinado descartado + gate CLINIC; UI gera→edita→salva usando o POST normal; regressão do fluxo manual do builder; nenhuma escrita no banco na geração (só no save).
