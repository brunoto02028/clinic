# T-3: Migrar as 12 rotas para `getMobileActor`

**Status:** pendente
**Depende de:** nenhuma

## Objetivo
Fazer as rotas mobile falharem fechado para conta desativada, em vez de confiar só na assinatura do JWT.

## Contexto
`getMobileUser` (`lib/mobile-auth-guard.ts`) verifica a assinatura do token e devolve o payload. **Não vai ao banco.** Um usuário desativado, excluído ou com papel alterado continua passando até o access token expirar.

`getMobileActor` (`lib/mobile-actor.ts`) relê o usuário (`id, role, clinicId, isActive`) e falha fechado.

Hoje: **6 rotas** usam `getMobileActor`, **12** usam `getMobileUser`. Conversa com a pendência já anotada de migrar rotas legadas para `getActor`.

As 12: `entitlements`, `labs/orders`, `labs/orders/[id]`, `me`, `work/business-profile`, `work/compliance`, `work/follow-ups`, `work/follow-ups/[id]`, `work/invoices`, `work/invoices/[id]`, `work/quotes`, `work/quotes/[id]`.

⚠️ Os helpers devolvem coisas diferentes: `getMobileUser` dá o payload do token (`sub`, `firstName`, `lastName`) e `getMobileActor` dá `{ userId, role, clinicId }`. Rotas que usam `payload.firstName` — como o `business-profile` — precisam buscar o nome de outro lugar. **Não é troca mecânica.**

## Passos
1. Migrar rota por rota, conferindo cada campo do payload em uso.
2. Onde o nome vinha do token, buscar do banco na mesma query do actor ou numa leitura explícita.
3. Manter o formato da resposta de erro (401 + `corsJson`), para não mudar contrato com o app.
4. Ao final, `getMobileUser` deve sobrar só onde houver motivo declarado — ou ser removido.

## Arquivos afetados
- As 12 rotas listadas
- `lib/mobile-auth-guard.ts` (possível remoção)

## Critérios de aceite
- [ ] Token válido de usuário com `isActive: false` recebe 401 nas 12 rotas
- [ ] Nenhuma regressão de campo (nada passou a vir vazio por causa do payload)
- [ ] Contrato de erro inalterado para o app
- [ ] `getMobileUser` removido, ou com justificativa por uso restante
