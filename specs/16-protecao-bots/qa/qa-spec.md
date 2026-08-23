# QA — Atividade 16: Proteção contra bots

Usar as **test keys** do Turnstile (Cloudflare fornece always-pass / always-fail / always-challenge)
no QA local, pra não depender das chaves reais de produção.

---

## T-1 — Infra
| # | Tipo | Passos | Esperado |
|---|------|--------|----------|
| 1.1 | UI | Página com site key configurada | Widget Turnstile carrega, emite token |
| 1.2 | UI | Sem site key | Widget não renderiza; form não quebra |
| 1.3 | lib | `verifyTurnstile` com token da test-key always-pass | `{ok:true}` |
| 1.4 | lib | token inválido/ausente | `{ok:false}` (fail-closed) |
| 1.5 | lib | siteverify inalcançável (mock/rede) | `{ok:true}` + log (fail-open) |
| 1.6 | config | secret vem do `systemConfig` | lido do DB; `grep` no repo sem segredo |

## T-2 — Formulários
| # | Tipo | Passos | Esperado |
|---|------|--------|----------|
| 2.1 | API | `POST /api/signup` sem token Turnstile | rejeitado (400/403 genérico) |
| 2.2 | API | signup com token always-pass | criado normalmente |
| 2.3 | API | honeypot `website` preenchido | rejeição silenciosa |
| 2.4 | API | newsletter sem token | rejeitado |
| 2.5 | API | send-code sem token | rejeitado (além do rate limit) |
| 2.6 | UI | fluxo humano completo (signup) | passa, widget não atrapalha |

## T-3 — Rate limiting
| # | Tipo | Passos | Esperado |
|---|------|--------|----------|
| 3.1 | API | 6+ signups rápidos do mesmo IP | 429 após o limite |
| 3.2 | API | send-code > 3 em 10min | 429 (comportamento mantido) |
| 3.3 | API | IP atrás do Cloudflare (`cf-connecting-ip`) | limite por IP real, não pelo proxy |
| 3.4 | API | login: brute-force de senha | 429 após N tentativas |
