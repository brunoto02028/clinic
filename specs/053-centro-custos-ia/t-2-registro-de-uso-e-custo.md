# T-2: Registro de uso e custo nas entradas centrais e nas chamadas diretas

**Status:** pendente
**Depende de:** T-1

## Objetivo
Toda chamada de IA, com sucesso ou falha, gera um `AiUsageEvent` com tokens e custo. Se a gravação falhar, a IA continua funcionando.

## Contexto
- **OpenRouter:** mandar `usage: { include: true }` no corpo da requisição faz a resposta trazer `usage.prompt_tokens`, `usage.completion_tokens` e `usage.cost` (USD). No streaming, o `usage` vem no último chunk.
- **Demais provedores:**
  - Gemini: `usageMetadata.promptTokenCount` / `candidatesTokenCount`;
  - Anthropic direto: `usage.input_tokens` / `output_tokens`;
  - Groq / OpenAI / MiniMax: `usage` no formato OpenAI.
  - Custo = tokens × tabela de preço (T-5). Até a T-5 existir, usar tabela inicial em código com o preço público de cada modelo usado hoje.
- Imagem e transcrição: registrar `imageCount` / `audioSeconds` quando o provedor não der tokens.

## Passos
1. `lib/ai-usage.ts` (novo):
   - `recordAiUsage(event)`: grava sem bloquear, com `try/catch` + `console.warn`, nunca lança;
   - `estimateCostUsd(provider, model, usage)`: consulta a tabela de preços.
2. Nas entradas centrais (`lib/ai-provider.ts`, `lib/claude.ts`, `lib/ai-providers/*`):
   - medir a latência;
   - ler o `usage` da resposta;
   - pedir `usage.include` ao OpenRouter;
   - chamar `recordAiUsage` no sucesso **e** na falha (falha com `success: false`, custo 0, a não ser que o provedor informe custo).
3. As funções aceitam `opts.usage?: { clinicId?, userId?, feature? }` e repassam ao evento. Sem `feature`, usar o nome da função como fallback (ex.: `callAI`). Sem `clinicId`, o evento fica não atribuído.
4. As 12 chamadas diretas: migrar para as entradas centrais quando for trivial. Se não for, chamar `recordAiUsage` no próprio arquivo.
5. `parseAIJson` e helpers sem chamada de rede: não registram nada.

## Arquivos afetados
- `lib/ai-usage.ts` (novo)
- `lib/ai-provider.ts`, `lib/claude.ts`, `lib/ai-providers/groq.ts`, `lib/ai-providers/minimax.ts`
- as 12 rotas/libs com chamada direta (lista no `plan.md`)

## Critérios de aceite
- [ ] `callAI` via OpenRouter (local, chave de dev) → 1 evento com `provider: "openrouter"`, tokens > 0, `costUsd > 0` e `costSource: "provider"`.
- [ ] Chamada que falha (ex.: modelo inválido) → evento `success: false`, e o erro original continua chegando a quem chamou.
- [ ] Banco indisponível para o evento (simulado) → a chamada de IA retorna normalmente.
- [ ] `streamAI` → evento gravado ao fim do stream, com tokens.
- [ ] Provedor sem custo informado → `costSource: "estimated"` com valor pela tabela, ou `unknown` quando não há preço.
- [ ] Nenhuma mudança de comportamento visível nas funcionalidades de IA existentes (gerador de treino, tradução de exercícios, relatórios clínicos): smoke de 3 fluxos.
