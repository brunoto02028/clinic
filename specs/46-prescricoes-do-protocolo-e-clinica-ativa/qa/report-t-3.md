# QA — T-3: Biblioteca de exercícios, pastas e prescrição manual na clínica ativa

**Resultado:** APROVADO
**Data:** 16/09/2026 · **Commit:** 097cf02

| Cenário | Ambiente | Obtido |
|---|---|---|
| BPR (padrão) | produção | `GET /api/admin/exercises?all=true` → 236 exercícios, mesma contagem de antes; tela Clinical → Exercises abre com as categorias — `screenshots/prod-t3-01-biblioteca.png` |
| Active Clinic = "Bruno" | produção | 1 exercício (a biblioteca dessa clínica); voltando para a BPR, 236 de novo |
| SUPERADMIN trocando a clínica ativa | local | BPR local: 48 · clínica A: 1 · BPR2: 0 |
| Terapeuta da clínica A | local | 1 exercício (o da própria clínica) |
| Conta sem clínica resolvida | local | 403 em vez de listar todas as clínicas; a tela mostra "No exercises found" — `screenshots/local-t3-01-biblioteca.png` |

## Unit
`__tests__/tenant/exercise-library-clinic.test.ts`: `resolveClinicId` dá a própria clínica ao staff
(ignorando cookie), a clínica ativa ao SUPERADMIN, e nunca mais "a primeira clínica da tabela";
`GET /api/admin/exercises` filtra pela clínica ativa, responde 403 sem clínica e 401 para paciente.

## Observação
`reset-library`, `backfill-duration`, `normalize-videos` e `voice-parse` ficaram de fora de
propósito (ver plan.md). As 18 rotas que ainda usam `lib/resolve-clinic-id.ts` estão marcadas como
migração pendente — o arquivo ganhou um aviso no topo.
