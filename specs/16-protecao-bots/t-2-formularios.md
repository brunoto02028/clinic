# T-2: Turnstile + honeypot nos formulários públicos

**Status:** pendente
**Depende de:** T-1

## Objetivo
Proteger os formulários públicos com Turnstile (client + verify no server) e honeypot.

## Contexto
- Formulários: **signup** (`components/auth/simplified-signup-form.tsx` → `/api/signup`),
  **newsletter** (rodapé → rota de subscribe), **OTP** (`/api/auth/send-code`, tela `/verify`).
- Honeypot já existe em `book-refer-form` — reutilizar o padrão (campo oculto `website` que
  humano nunca preenche).

## Passos
1. Signup: adicionar `<Turnstile>` + honeypot no form; `/api/signup` chama `verifyTurnstile` e
   rejeita se falhar / honeypot preenchido (retorna 400/403 genérico).
2. Newsletter: idem no form do rodapé + verify na rota de subscribe.
3. OTP (`/api/auth/send-code`): adicionar verify do Turnstile (reforça o rate-limit já existente)
   + honeypot na tela.
4. Mensagens de erro genéricas (não revelar que foi o anti-bot).

## Arquivos afetados
- `components/auth/simplified-signup-form.tsx`, `app/api/signup/route.ts`
- form de newsletter (rodapé) + rota de subscribe
- `app/verify/*` / `app/api/auth/send-code/route.ts`

## Critérios de aceite
- [ ] Submissão sem token válido do Turnstile → rejeitada.
- [ ] Honeypot preenchido → rejeitada silenciosamente.
- [ ] Humano com Turnstile OK → passa normal.
- [ ] Erros genéricos; sem quebrar o fluxo legítimo.
