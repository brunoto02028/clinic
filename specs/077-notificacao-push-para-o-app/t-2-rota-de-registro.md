# T-2: A rota de registro aceita o bearer do app

**Status:** pendente
**Depende de:** nenhuma

## Objetivo
`POST /api/push-token` passa a funcionar para o app, e guarda token da Expo.

## Contexto
A rota existe desde antes e so resolve **cookie** (`getServerSession`). O app manda bearer, e
`/api/push-token` **nao esta** em `MOBILE_API_PREFIXES` - o middleware devolve 307 para `/login`.
Ou seja, o app nao conseguiria registrar nada.

## Passos
1. Trocar `getServerSession` por `getEffectiveUser`, que resolve cookie **e** bearer.
2. Acrescentar `/api/push-token` a `MOBILE_API_PREFIXES` no `middleware.ts`.
3. Validar o formato do token (`ExponentPushToken[...]`) - lixo nao entra no banco.
4. Guardar `platform` e manter `@@unique([userId, token])`; reinstalar o app gera token novo, e o
   antigo morre pelo recibo da T-3, nao aqui.
5. `DELETE` desativa o token do aparelho no logout.

## Arquivos afetados
- `app/api/push-token/route.ts`, `middleware.ts`

## Criterios de aceite
- [ ] Bearer de paciente registra; sem credencial, recusado
- [ ] Token malformado: 400, sem 500
- [ ] Um paciente nao consegue registrar token em nome de outro
- [ ] `OPTIONS` anuncia `POST` e `DELETE` (a licao da 075)
