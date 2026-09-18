# T-6: Guards e rotas

**Status:** pendente
**Depende de:** T-1

## Objetivo
Rotas branded acessíveis; clínica intocada; personal gate não bloqueia as páginas de auth.

## Contexto
D6/D9. `middleware.ts`: `publicRoutes`, personal gate (`:299-316`).

## Passos
1. Adicionar `/studio/[slug]` às rotas públicas (auth) no `middleware.ts`.
2. Garantir que o personal-blocked gate não pega `/studio/*` nem `/join/*`.
3. Confirmar `/login` e `/staff-login` sem mudança (teste de regressão).

## Arquivos afetados
- `middleware.ts`, possivelmente `lib/personal-blocked-routes.ts`.

## Critérios de aceite
- [ ] `/studio/[slug]` público (sem login) e não bloqueado pelo personal gate.
- [ ] `/login` e `/staff-login` idênticos ao atual (genéricos).
