# QA — T-5: Rotas de manutenção da biblioteca

**Resultado:** APROVADO
**Data:** 16/09/2026 · **Commits:** 99bc227, ca48036

## Produção (só simulação — nada foi alterado)
| Cenário | Obtido |
|---|---|
| `normalize-videos?dryRun=true` com a BPR ativa | 200, `scope: "BPR Physical Rehabilitation"` |
| idem com a clínica "Bruno" ativa | 200, `scope: "Bruno"` |
| idem com `&allClinics=true` | 200, `scope: "all clinics"` |
| `reset-library?dryRun=true` na BPR | 200 — plano apagaria **238** exercícios |
| `reset-library?dryRun=true` na clínica "Bruno" | 200 — plano apagaria **1** exercício |
| `reset-library` sem `?confirm=DELETE-ALL` | 400, recusa (nada apagado em nenhum momento) |

Os dois planos de reset mostram o escopo por clínica de forma direta: antes, a mesma chamada
enxergava a biblioteca inteira da plataforma.

## Unit (`__tests__/tenant/exercise-maintenance-clinic.test.ts`, 11 casos)
- `backfill-duration`: filtra pela clínica ativa e nomeia a clínica no retorno; `?allClinics=true`
  tira o filtro; `?allClinics=1` **não** conta (só o valor exato); sem clínica → 403 sem consultar
  nada; ADMIN → 401 inclusive com `?allClinics=true`.
- `normalize-videos`: a contagem e a listagem usam exatamente o mesmo filtro (se divergirem, a
  paginação por lotes quebra); `?allClinics=true`; 403 sem clínica; 401 para terapeuta.
- `reset-library`: apaga exercícios e pastas só da clínica ativa; `?allClinics=true` apaga de todas;
  segue recusando sem confirmação (400), sem clínica (403) e para quem não é SUPERADMIN (401).

## Observação
`voice-parse` não foi migrada porque não acessa o banco — só repassa o texto ditado para a IA. Ficou
um comentário na rota explicando.

`npx jest` → 34 suítes, 356 testes. `tsc` e lint sem nada novo.
