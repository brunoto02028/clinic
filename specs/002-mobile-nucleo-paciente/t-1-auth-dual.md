# T-1: Auth dual no backend (cookie OU bearer)

**Status:** concluído (QA `report-t-1.md` aprovado + correção de segurança verificada)
**Depende de:** nenhuma

## Objetivo
Permitir que as APIs do paciente desta fase autentiquem tanto a sessão web (NextAuth
cookie) quanto o app mobile (bearer JWT), sem duplicar lógica nem quebrar o web.

## Contexto
As rotas usam `getServerSession(authOptions)`. O app envia `Authorization: Bearer`.
Um helper unificado resolve o usuário a partir de qualquer um dos dois.

## Passos
1. Criar `lib/dual-auth.ts`: `getRequestUser(request)` → tenta `getServerSession`;
   se ausente, usa `getMobileUser` (bearer) + `getValidatedUserById` para o shape comum.
   Retorna `{ id, role, clinicId, permissions, ... }` ou null.
2. Confirmar a rota de perfil (candidatas `/api/patient/*`, `/api/users`).
3. Aplicar o helper nas rotas da fase: `appointments` (route + `[id]`), `exercises`,
   e a rota de perfil — substituindo a checagem de sessão por `getRequestUser`.
4. Garantir escopo: paciente só acessa os próprios dados (filtro por `user.id`).

## Arquivos afetados
- `lib/dual-auth.ts` (novo)
- `app/api/appointments/route.ts`, `app/api/appointments/[id]/route.ts`
- `app/api/exercises/route.ts`
- rota de perfil (a confirmar)

## Critérios de aceite
- [ ] Bearer válido autentica nas rotas da fase.
- [ ] Cookie de sessão (web) continua funcionando nas mesmas rotas.
- [ ] Sem token / token inválido → 401.
- [ ] Paciente só vê os próprios dados.
