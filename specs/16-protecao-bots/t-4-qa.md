# T-4: QA

**Status:** pendente
**Depende de:** T-1..T-3

## Objetivo
Validar que bots são barrados e humanos passam, sem quebrar os fluxos legítimos.

## Cenários (detalhe em qa/qa-spec.md)
1. **Turnstile:** submeter signup **sem** token → rejeitado; **com** token válido (Turnstile
   test keys) → passa.
2. **Honeypot:** preencher o campo oculto → rejeição silenciosa.
3. **Rate limit:** estourar N requisições em signup/send-code → 429; dentro do limite → ok.
4. **Fail-open:** simular siteverify indisponível → não bloqueia humano (loga).
5. **Config:** secret lido do `systemConfig`; sem segredo no repo.
6. **UX:** widget aparece, não atrapalha; erros genéricos.

## Notas
- Cloudflare fornece **test keys** de Turnstile (always-pass / always-fail) — usar no QA local.

## Critérios de aceite
- [ ] Bot (sem token / honeypot) barrado; humano passa.
- [ ] Rate limit funciona nos endpoints alvo.
- [ ] Fail-open em outage; sem segredo commitado.
