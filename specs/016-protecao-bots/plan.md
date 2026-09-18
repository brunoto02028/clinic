# Atividade 16 — Proteção real contra bots (Camada 2, app)

**Status geral:** implementada e verificada ao vivo (test keys). Prod precisa da secret real
no systemConfig + site key + Camada 1 no Cloudflare (site já proxied). Aguarda code review final.

## Objetivo
Adicionar proteção **de verdade** contra bots nos formulários e endpoints públicos do
bpr.clinic: **Cloudflare Turnstile** (CAPTCHA invisível), **honeypot** e **rate limiting**
padronizado. Foco: barrar spam de formulário, abuso de OTP/e-mail e brute-force — não só o
scraping de e-mail (que já foi resolvido removendo o e-mail do site).

Esta é a **Camada 2 (aplicação)**. A **Camada 1 (borda/Cloudflare)** — Bot Fight Mode,
Managed Challenge, WAF e rate-limiting rules — é configurada por você no painel do Cloudflare
(o token atual só faz DNS; eu não configuro). Ver seção "Camada 1" abaixo.

## Estado atual (levantado)
- **CAPTCHA:** não existe.
- **Rate limiting:** ad-hoc só em `send-code` (OTP, 3/10min), `verify-code`, `beyond-pain/refer`,
  `body-assessments/capture`. **Signup, login, newsletter sem nada.**
- **Honeypot:** só em `components/book-refer-form.tsx`. **robots.txt:** existe.

## Decisões de design
1. **Turnstile** (Cloudflare) em vez de hCaptcha/reCAPTCHA — grátis, integra com o Cloudflare
   que já usam, baixa fricção (invisível/managed).
2. **Segredo do Turnstile no DB (`systemConfig`), não em env** — como você não tem acesso ao
   env da VPS (mesmo bloqueio do GA/AI_STRICT_MODE), o `TURNSTILE_SECRET_KEY` fica no
   `systemConfig` (padrão que o app já usa pra chaves de IA via `getConfigValue`). O **site key**
   (público) pode vir de `NEXT_PUBLIC_TURNSTILE_SITE_KEY` **ou** fallback no código (é público,
   igual ao GA).
3. **Fail-closed no essencial, sem travar por outage:** token ausente/ inválido → rejeita.
   Se a verificação (siteverify) falhar por rede/outage do Cloudflare → loga e **deixa passar**
   (não bloquear pacientes por indisponibilidade rara do Turnstile). Ajustável.
4. **Rate limit:** util compartilhado **in-memory por IP** (segue o padrão já usado em
   `body-assessments/capture`), single-instance na VPS. Reinicia com o processo e não é
   distribuído — aceitável agora; se escalar, migrar pra DB/Redis.
5. **Formulários no escopo:** signup, newsletter, OTP (`send-code`) e login. (Booking já cai no
   fluxo de signup/portal.)

## Tarefas

| Tarefa | Nome | Status |
|--------|------|--------|
| T-1 | Infra Turnstile: `<Turnstile>` + verificação no servidor + config (DB/env) | implementada — verificada |
| T-2 | Turnstile+honeypot em signup; honeypot em newsletter (OTP fica com rate-limit) | implementada — verificada |
| T-3 | Util de rate limiting + aplicar em signup/newsletter/login | implementada — verificada |
| T-4 | QA (bot bloqueado, humano passa, rate limit) | concluída — ao vivo |

Ciclo por tarefa: implementar → qa-tester → code review → concluir.

## Suposições (validar antes de implementar)
- **Turnstile:** você gera as chaves (site key + secret) no Cloudflare. Secret vai no
  `systemConfig` (eu crio a entrada no admin/DB); site key no código/env.
- **Rate limit in-memory** (single-instance). Se o app roda com múltiplas instâncias, muda pra DB.
- **Login:** o provider é NextAuth credentials — o Turnstile no login exige passar o token pelo
  fluxo do NextAuth (um pouco mais chato). Se preferir, começamos por signup/newsletter/OTP e
  deixamos login só com rate-limit. Confirmar.
- **Fail-open em outage** do Turnstile (decisão 3). Se preferir fail-closed total, avisar.

## Camada 1 — Cloudflare (você, no painel) — checklist
- Garantir o site **proxied (nuvem laranja)**, não DNS-only.
- **Bot Fight Mode**: ON (Security → Bots).
- **Managed Challenge** / WAF rule pra caminhos sensíveis (`/api/auth/*`, `/signup`).
- **Rate limiting rule** (ex.: `/api/auth/send-code` e `/api/signup` — N req/min por IP).
- (Posso detalhar o passo-a-passo quando você for aplicar.)

## Fora de escopo
- Configuração do Cloudflare (Camada 1) — é no painel, do seu lado.
- Migração de rate-limit pra Redis/distribuído (só se escalar).
- CAPTCHA em áreas logadas (admin/portal) — foco é o público.
