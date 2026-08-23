# T-3: Rate limiting padronizado

**Status:** pendente
**Depende de:** nenhuma (pode ir em paralelo)

## Objetivo
Um util de rate limiting compartilhado e aplicá-lo consistentemente nos endpoints sensíveis.

## Contexto
- Hoje é ad-hoc (só send-code/verify-code/refer/capture). Signup e login não têm.
- Padrão in-memory por IP já existe em `body-assessments/capture` — generalizar.

## Passos
1. `lib/rate-limit.ts`: `rateLimit(key, { max, windowMs })` in-memory (Map por IP+rota),
   retorna `{ allowed, retryAfter }`. Limpeza de janelas expiradas.
2. Helper pra extrair IP do request (x-forwarded-for/Cloudflare `cf-connecting-ip`).
3. Aplicar:
   - `/api/signup` (ex.: 5/hora por IP)
   - login (NextAuth authorize / rota de credenciais) (ex.: 10/10min por IP)
   - `/api/auth/send-code` — migrar o limite atual pro util (mantendo 3/10min)
4. Resposta 429 com mensagem genérica quando estourar.

## Arquivos afetados
- `lib/rate-limit.ts` (novo)
- `app/api/signup/route.ts`, fluxo de login, `app/api/auth/send-code/route.ts`

## Critérios de aceite
- [ ] Exceder o limite → 429; dentro do limite → normal.
- [ ] IP resolvido corretamente atrás do Cloudflare (`cf-connecting-ip`).
- [ ] send-code mantém o comportamento atual via util.
