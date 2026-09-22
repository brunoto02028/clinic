# QA — Atividade 071: Segurança da API mobile

Tipos: **API** (curl) e **UI** (app no Expo). Rodar local e, após deploy, em produção.

## Perfis
| Perfil | Descrição |
|---|---|
| A1 | Usuário mobile ativo, com token válido |
| A2 | Usuário com token válido mas `isActive: false` |
| A3 | Sem token |

---

## T-1 — catálogo de exames

### C1 — API · sem token é rejeitado
**Passos:** `GET /api/mobile/labs/catalog` e `/labs/catalog/{id}` sem header.
**Esperado:** 401 nos dois. Hoje devolvem 200 — é a regressão a provar corrigida.

### C2 — API · resposta autenticada não vaza custo
**Passos:** mesmos GETs com A1. Inspecionar o JSON inteiro.
**Esperado:** 200 e **nenhuma** ocorrência de `costPrice`, `lmlProductId` ou `lastSyncedAt`.

### C3 — UI · telas de Lab seguem funcionando
**Passos:** abrir catálogo e detalhe de produto no app com A1.
**Esperado:** lista e detalhe renderizam com o `select` reduzido. Sem campo vazio nem crash.

---

## T-2 — GET não escreve

### C4 — API · GET não cria linha
**Passos:** contar `BusinessProfile` de A1; chamar `GET /api/mobile/work/business-profile` 3 vezes; contar de novo.
**Esperado:** contagem inalterada. Resposta `{ profile: null }` quando não existe.

### C5 — UI · app trata perfil ausente
**Passos:** abrir a tela de perfil de negócio no BA com usuário sem perfil.
**Esperado:** estado vazio, sem crash, com caminho para preencher.

### C6 — API · PUT ainda cria
**Passos:** PUT com dados válidos para A1 sem perfil.
**Esperado:** 200 e linha criada. GET seguinte devolve o perfil.

---

## T-3 — autenticação relê o usuário

### C7 — API · conta desativada é barrada nas 12 rotas
**Passos:** gerar token válido para A2, desativar a conta (`isActive: false`), chamar as 12 rotas.
**Esperado:** 401 em **todas**. Cenário central da T-3.

### C8 — API · usuário ativo não regrediu
**Passos:** chamar as 12 rotas com A1.
**Esperado:** 200, com os mesmos campos de antes. Atenção a `business-profile`, que lia o nome do payload do token.

### C9 — API · contrato de erro inalterado
**Passos:** chamar as 12 rotas sem token.
**Esperado:** mesmo formato de erro de antes (401 + corpo `corsJson`), para o app não precisar mudar.

---

## Limpeza
Remover usuários, tokens e linhas de `BusinessProfile` criados. O report lista o que foi criado e confirma a remoção.
