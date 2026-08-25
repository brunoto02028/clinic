# T-3: C3 — Solicitar retorno de ligação

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Contato de baixo compromisso: form nome + telefone na home que cria um `SalesLead`, visível no painel `/admin/sales` existente.

## Arquivos afetados
- `app/api/callback/route.ts` (novo — POST público)
- `components/home-callback.tsx` (novo — form)
- `components/landing-page.tsx` (render)
- `middleware.ts` (`/api/callback` em `publicRoutes`)

## Critérios de aceite
- [x] POST cria `SalesLead` (source=website, stage=new, priority=high, interestedIn=callback).
- [x] Valida nome + telefone; honeypot + rate-limit 5/h por IP; sem Turnstile (sem fricção).
- [x] Estado de sucesso no form; bilíngue EN/PT.
- [x] Lead aparece no `/admin/sales` (sem admin novo).
