# T-1: Infra Turnstile (widget + verificação + config)

**Status:** pendente
**Depende de:** nenhuma

## Objetivo
Base reutilizável do Cloudflare Turnstile: componente de widget no cliente, verificação no
servidor, e resolução das chaves (secret no `systemConfig`, site key no env/código).

## Passos
1. `components/turnstile.tsx` (`"use client"`): renderiza o widget Turnstile (script
   `challenges.cloudflare.com/turnstile/v0/api.js`), expõe o token via callback/props
   (`onToken`), com reset em erro/expiração. Não renderiza se não houver site key.
2. Site key: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` com fallback no código (é público). 
3. `lib/turnstile.ts`: `verifyTurnstile(token, ip?)` → chama `siteverify` com o secret vindo de
   `getConfigValue('TURNSTILE_SECRET_KEY')` (systemConfig) com fallback a `process.env`.
   Retorna `{ ok: boolean, reason?: string }`. **Fail-open** em erro de rede (loga, retorna ok),
   **fail-closed** em token ausente/inválido.
4. Criar a entrada `TURNSTILE_SECRET_KEY` no `systemConfig` (via admin/seed) — documentar como
   preencher (o Bruno cola a secret).

## Arquivos afetados
- `components/turnstile.tsx` (novo)
- `lib/turnstile.ts` (novo)

## Critérios de aceite
- [ ] Widget carrega e emite token quando site key presente; nada quando ausente.
- [ ] `verifyTurnstile` valida token real e rejeita inválido; fail-open em outage de rede.
- [ ] Secret lido do `systemConfig` (sem depender de env do servidor).
- [ ] Sem segredo commitado no repo.
