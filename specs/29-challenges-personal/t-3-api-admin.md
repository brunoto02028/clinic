# T-3: API admin

**Status:** concluído
**Depende de:** T-1, T-2

## Objetivo
CRUD de desafios do estúdio + leaderboard por desafio. Tenant scoped, gate TRAINING.

## Passos
1. `app/api/admin/challenges/route.ts`:
   - GET → lista desafios do tenant (com contagem de participantes). Gate `assertTrainingAccess`.
   - POST → cria desafio (`validateChallenge`), `clinicId`+`trainerId` do ator.
2. `app/api/admin/challenges/[id]/route.ts`:
   - GET → um desafio + **leaderboard** (via `lib/challenges.leaderboard`, participantes do tenant).
   - PATCH → editar título/descrição/target/datas/status (archive). **G8: ao mudar target/janela, limpar `completedAt` dos participantes que não satisfazem mais** (recomputa via progressForMany).
   - DELETE → archive (status ARCHIVED) ou remover (cascade participants).
   - `assertRecordAccess` para garantir tenant.
3. Erros: 401 sem sessão; 404 tenant errado; 400 inválido; gate 404 para CLINIC.

## Arquivos afetados
- `app/api/admin/challenges/route.ts` (+ `[id]`)

## Critérios de aceite
- [ ] POST cria; GET lista só do tenant; GET [id] retorna leaderboard ordenado.
- [ ] PATCH/archive ok; DELETE remove/arquiva.
- [ ] Sem sessão 401; tenant/desafio de outro tenant 404; inválido 400; tenant CLINIC negado (gate).
