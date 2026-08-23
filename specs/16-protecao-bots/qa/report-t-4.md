# QA Report — Atividade 16 (T-4): proteção contra bots

**Data:** 2026-08-23 · **Resultado:** APROVADO · verificado ao vivo no dev server (`:4123`) com
as **test keys** do Turnstile (secret always-pass).

## T-1 — Infra (Turnstile + verify)
- `verifyTurnstile`: **fail-closed em token ausente** (signup sem token → 403) e **pass** com
  token quando o secret de teste always-pass está ativo (signup com token → 200). Verificado via
  smoke test.
- Secret lido de `systemConfig` (`TURNSTILE_SECRET_KEY`) com fallback a env e à test key. Sem
  segredo no repo.
- Widget `components/turnstile.tsx`: site key de `NEXT_PUBLIC_TURNSTILE_SITE_KEY` com fallback à
  test key pública.

## T-2 — Formulários (signup, newsletter)
- **Signup honeypot** (`website` preenchido) → **400** (bot barrado silenciosamente).
- **Signup sem Turnstile token** → **403** (fail-closed).
- **Signup válido** (campos + token de teste + honeypot vazio) → **200, conta criada**.
- **Newsletter honeypot** (`website` preenchido) → **200 `{success:true}`** absorvido (não
  cria contato real).

## T-3 — Rate limiting
- **Signup:** rajada de 7 do mesmo IP → **#1–5 = 200, #6–7 = 429** (limite 5/h por IP). ✅
- **Login:** rate-limit no `authorize` do NextAuth (10/10min por IP via `cf-connecting-ip`),
  retorna null ao estourar (pula bcrypt). Verificado por código/typecheck.
- IP resolvido via `cf-connecting-ip` (atrás do Cloudflare).

## Evidência (smoke test)
```
signup honeypot        -> 400
signup sem token       -> 403
signup válido          -> 200 (Account created)
newsletter honeypot    -> 200 {success:true} (absorvido)
signup rajada          -> 200,200,200,200,200,429,429
```

## Typecheck
Limpo em todos os arquivos da atividade (turnstile, rate-limit, signup, newsletter, auth-options).

## Notas
- OTP (`send-code`) mantido só com o rate-limit existente (evita fricção de widget no reenvio).
- **Produção:** Bruno cola a **secret real do Turnstile** no `systemConfig` e o **site key real**
  (público) no código/env; e ativa a **Camada 1** no Cloudflare (Bot Fight Mode/WAF/rate rules) —
  o site já está **proxied (laranja)**, então essas proteções valem.
- Usuários de teste do QA foram removidos do banco local.
