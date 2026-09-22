# Atividade 071 — Segurança da API mobile

**Status geral:** plano proposto — aguardando aprovação do Bruno.

## Origem
Achados do QA da atividade 070 (T-2), fora do escopo daquela tarefa. Verificados um a um antes de virarem spec — não é repasse de relatório de agente.

## Objetivo
Fechar três buracos na superfície `/api/mobile/**`: catálogo de exames aberto na internet com preço de custo, escrita durante um GET, e autenticação que não relê o usuário.

## Os três problemas

### P1 — `labs/catalog` é público e vaza margem
`app/api/mobile/labs/catalog/route.ts` **não tem nenhuma checagem de autenticação**. `curl` sem header devolve 200. O mesmo vale para `labs/catalog/[id]`.

Pior que o acesso aberto é o que ele devolve: um `prisma.labProduct.findMany()` sem `select`, ou seja, a **linha inteira**:

```
retailPrice, costPrice, lmlProductId, lastSyncedAt, ...
```

`costPrice` é o preço de custo e `lmlProductId` é o identificador do produto no fornecedor (LML). Qualquer pessoa na internet consegue a margem de cada exame e o mapa do catálogo do fornecedor.

`LabProduct` **não** tem `clinicId` — é catálogo global. Então não há vazamento entre tenants; o problema é comercial, não multi-tenant.

### P2 — `work/business-profile` escreve durante um GET
`app/api/mobile/work/business-profile/route.ts`: se o perfil não existe, o GET **cria a linha** com `prisma.businessProfile.create()`. Um GET não deveria ter efeito colateral. Na prática, qualquer usuário autenticado que toque o endpoint ganha um `BusinessProfile` — inclusive paciente de clínica, que não tem nada a ver com o módulo BA. Foi assim que o QA da 069 criou uma linha sem querer, só por sondar o endpoint.

### P3 — 12 rotas autenticam sem reler o usuário
`getMobileUser` (`lib/mobile-auth-guard.ts`) só verifica a assinatura do JWT e devolve o payload. Não vai ao banco. `getMobileActor` (`lib/mobile-actor.ts`) relê o usuário e falha fechado quando a conta está inativa.

Hoje: **6 rotas** usam `getMobileActor`, **12** usam `getMobileUser`. Nessas 12, um usuário desativado, excluído ou com papel alterado continua entrando até o access token expirar.

Rotas afetadas: `entitlements`, `labs/orders`, `labs/orders/[id]`, `me`, `work/business-profile`, `work/compliance`, `work/follow-ups`, `work/follow-ups/[id]`, `work/invoices`, `work/invoices/[id]`, `work/quotes`, `work/quotes/[id]`.

## Tarefas
| T-N | Nome | Status |
|-----|------|--------|
| T-1 | Fechar o catálogo de exames e parar de devolver custo | pendente |
| T-2 | GET de `business-profile` deixa de escrever | pendente |
| T-3 | Migrar as 12 rotas para `getMobileActor` | pendente |
| T-4 | QA | pendente |

## Suposições (validar antes de executar)
1. **O catálogo exige login.** Assumo que ver exames é para usuário autenticado, como toda rota mobile irmã. Se a intenção era vitrine pública, então o `select` continua sendo obrigatório e a decisão vira "público, mas sem custo".
2. **`costPrice` e `lmlProductId` nunca vão para o cliente**, nem autenticado. O app não usa nenhum dos dois — confirmar na T-1 lendo `mobile/app/(app)/(lab)/`.
3. **Criar `BusinessProfile` continua no PUT**, que já faz `upsert`. O GET passa a devolver `{ profile: null }` quando não existe, e o app trata.
4. **Sem mudança de contrato para o app** além do `profile: null` do P2.
5. Atividade **independente da 069** — pode ir antes, depois ou em paralelo.

## Relação com a 069
A 069 fechou o gating de *módulos* no endpoint `/api/mobile/modules` e pôs guard de rota no app. O QA apontou que os endpoints de **dado** de Lab e BA não checam módulo nenhum: com o Bearer de um paciente que só tem `clinica`, `labs/catalog`, `labs/orders` e `work/*` respondem 200. Isso é a outra metade do mesmo problema, mas é escopo desta atividade e não daquela.
