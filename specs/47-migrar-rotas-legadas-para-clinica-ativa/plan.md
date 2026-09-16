# Ativ. 47 — Migrar as 18 rotas legadas para a clínica ativa

**Status:** concluído (16/09/2026) — commits cd30d75, 77497f0

## Objetivo
Tirar `lib/resolve-clinic-id.ts` de circulação: as 18 rotas que ainda o usam passam a trabalhar na
mesma clínica que o resto do sistema (a "Active Clinic" do SUPERADMIN) e a falhar fechado quando
nenhuma clínica é resolvida — hoje várias seguem adiante com `clinicId` nulo, o que significa
consulta sem filtro de clínica.

## Situação atual (verificada no código, 16/09/2026)
- `lib/resolve-clinic-id.ts`: clínica da sessão → clínica do usuário no banco → **primeira clínica
  da tabela**. Ignora a "Active Clinic" e, para uma conta sem clínica, entrega outra clínica.
- 18 rotas, 27 chamadas: social/marketing (11 arquivos), equipamentos (2), agenda/bloqueios,
  plano do Atlas (2), artigos/instagram.
- Chamadas que **não** tratam clínica nula e seguem com filtro incompleto:
  - `social/accounts/[id]`: `if (!account || (clinicId && account.clinicId !== clinicId))` — com
    nulo, a checagem de dono some;
  - `social/posts` GET: `if (clinicId) where.clinicId = clinicId` — sem filtro, lista de todas;
  - `social/accounts` GET, `social/campaigns` GET, `social/templates` GET,
    `social/instagram-overview`, `marketing/content-calendar`, `marketing/publish-instagram`,
    `calendar/blocks` (GET e POST), `equipment/[id]` (PATCH e DELETE),
    `articles/instagram` (2), `atlas/treatment-plan`,
    `patients/[id]/atlas-treatment-plan` (usa `|| ""`).
- Em produção não há conta de staff sem clínica, então o caminho nulo é praticamente inalcançável
  hoje — o risco é entrar uma clínica nova ou uma conta sem clínica.

## Decisões de design
1. **Uma implementação só.** `lib/session-clinic.ts` (novo) exporta `sessionClinicId(session)`:
   clínica da sessão (ou do usuário no banco) para todo mundo; para SUPERADMIN, a "Active Clinic"
   do cookie quando houver, senão a própria. Sem "primeira clínica da tabela".
   `lib/resolve-clinic-id.ts` é apagado; `lib/exercise-folders.ts` passa a reexportar a mesma
   função (o `resolveClinicId` criado na Ativ. 46 vira um apelido, para não existirem duas versões
   com o mesmo nome).
2. **Falha fechada em toda chamada:** sem clínica resolvida → 403
   `{ error: "No clinic resolved for this account" }`, inclusive nas listas (hoje algumas devolvem
   `[]`, outras devolvem tudo). Nenhuma consulta roda com `clinicId` nulo.
3. **Papéis como estão.** Esta atividade não mexe em quem pode chamar cada rota, só na clínica.
   Exceção achada na revisão: `DELETE /api/admin/calendar/blocks` apagava bloqueio por id, sem
   clínica nenhuma (nunca usou o helper, por isso não estava na lista) — passou a apagar só dentro
   da clínica e a responder 404 fora dela.
4. **Efeito colateral registrado:** a biblioteca de exercícios (ativ. 46) passa a usar o mesmo
   helper, que busca a clínica no banco quando a sessão não a traz — uma conta cujo token é
   anterior à clínica passa a funcionar onde antes falhava fechado.
5. **Sem mudança de comportamento para contas normais:** para ADMIN/THERAPIST a clínica continua
   sendo a da conta; para o SUPERADMIN passa a ser a clínica ativa (que, sem seleção, é a dele).

## Tarefas

| T-N | Nome | Status |
|-----|------|--------|
| T-1 | `lib/session-clinic.ts` único + apagar o legado + reexportar em exercise-folders | concluído |
| T-2 | Migrar as 11 rotas de social/marketing | concluído |
| T-3 | Migrar equipamentos, agenda/bloqueios, Atlas e artigos/instagram (7 chamadas) | concluído |
| T-4 | Testes e varredura final (nenhum `resolve-clinic-id` sobrando) | concluído |

## Suposições (validar com o usuário)
- Responder 403 (em vez de lista vazia) quando não há clínica é aceitável: em produção toda conta
  de staff tem clínica, e uma lista vazia esconderia o problema.
- Nenhuma tela quebra com 403: as que consomem essas rotas já tratam resposta de erro (conferir no
  QA, Marketing/Social e Equipamentos são as principais).
- O cookie "Active Clinic" continua sendo a fonte da clínica do SUPERADMIN, como nas ativ. 45/46.

## Resultado (16/09/2026)
- `lib/resolve-clinic-id.ts` apagado; 18 rotas e 27 chamadas passaram para `lib/session-clinic.ts`,
  todas falhando fechado. QA local + produção aprovado (`qa/report-t-1..4.md`).
- Revisão de código independente achou um vazamento que não estava na lista: `DELETE` de bloqueio de
  agenda apagava por id, sem clínica — corrigido (apaga só dentro da clínica, 404 fora).
- Produção antes × depois com a BPR ativa: respostas idênticas; com a clínica "Bruno" ativa, cada
  rota passa a devolver os dados dessa clínica.

## Pendências
1. `DEFAULT_CLINIC_SLUG` continua indefinido em produção — hoje inofensivo (os dois SUPERADMIN têm
   clínica na conta), mas passa a ser obrigatório se existir uma conta SUPERADMIN sem clínica.
2. `scripts/seed-clinic.js` cita o helper antigo num comentário histórico; sem efeito no código.
