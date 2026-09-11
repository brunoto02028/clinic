# QA Spec — Atividade 32 (AI Workout Builder)

Tenant PERSONAL_TRAINER (TRAINING on) com admin + aluno + catálogo de exercícios (alguns sem vídeo, para testar filtro); tenant CLINIC (regressão). en-GB. Fixtures limpas. Chamadas reais de IA em quantidade mínima (custo); mockar/limitar onde possível para os cenários de erro.

## T-1 API
- **Unit** `buildCatalogForPrompt` prioriza por foco e respeita o cap.
- **Unit** `validateGeneratedWorkout`: exerciseId fora do allowed é descartado; 0 sobrando → erro; shape inválido → erro.
- **API happy** POST ai-generate com aluno válido e catálogo não-vazio → 200 `{generated}` só com IDs do catálogo do tenant; 0 linhas novas em Workout/WorkoutExercise.
- **API catálogo vazio** tenant sem exercício ativo c/ vídeo → 400.
- **API rate limit** estourar o teto → 429.
- **API scope/gate** sem sessão 401; studentId de outro tenant 404; tenant CLINIC sem TRAINING → 404.

## Gaps do plano (cobertura extra)
- **G-4** shape do `exercise` embutido é flat (`{exerciseId,name,videoUrl,...}`), não aninhado — as rows populam sem 2ª chamada.
- **G-1b** maxTokens 4096; simular/observar treino com muitos exercícios não trunca o JSON (ou, se truncar, vira 502 tratado — não crash).
- **G-6** timeout do provider (~30s) → 504 claro, form sai do loading.
- **G-2** foco sem nenhum exercício correspondente → cai pro catálogo geral, resposta com `usedFallbackCatalog:true`, UI mostra aviso.
- **G-3** campo omitido pela IA (ex. sem `restSeconds`) é preenchido com o `defaultRestSec` do Exercise.

## T-2 UI
- **UI** "Generate with AI" abre form; gerar preenche nome+exercícios editáveis (mesma UI manual, shape flat sem 2ª chamada); Save persiste via o POST normal (verificar payload idêntico ao manual).
- **UI erro** catálogo vazio/rate limit/timeout exibem mensagem no dialog, form não quebra, sem spinner infinito.
- **UI fallback** aviso "using your full library" quando `usedFallbackCatalog:true`.
- **UI regenerar** com rows preenchidas (geradas ou editadas) pede confirmação; confirma → substitui TODAS as rows (tudo-ou-nada, G-5).

## T-3 Gating + regressão
- Gate confirmado; zero escrita na geração; fluxo manual do builder (criar/editar sem IA) sem regressão; console sem erros/warnings.
