# QA — T-1: Um helper só para a clínica da sessão

**Resultado:** APROVADO
**Data:** 16/09/2026 · **Commits:** cd30d75, 77497f0

## Unit (`__tests__/tenant/session-clinic.test.ts`, 8 casos)
| Cenário | Obtido |
|---|---|
| ADMIN/THERAPIST com cookie de outra clínica | clínica da própria conta; a clínica do cookie nem é consultada |
| SUPERADMIN com clínica ativa selecionada | a clínica selecionada |
| SUPERADMIN sem seleção | a própria clínica |
| Cookie apontando para clínica inexistente ou inativa | volta para a própria clínica |
| Sessão sem `clinicId` (token anterior à clínica) | busca no banco |
| Conta sem clínica nenhuma | `null` — nunca "a primeira clínica da tabela" |
| SUPERADMIN sem clínica própria | clínica padrão da plataforma, ou `null` se não houver (e um ADMIN nunca chega nesse caminho) |
| `cookies()` indisponível (scripts/testes) | não quebra, usa a clínica da conta |

## Varredura
- `grep -r "resolve-clinic-id" app lib components scripts` → nenhuma referência (só uma menção
  histórica num comentário de `scripts/seed-clinic.js`).
- `lib/exercise-folders.ts` reexporta o mesmo helper, então biblioteca de exercícios e as 18 rotas
  passam a usar exatamente a mesma regra.
- `npx jest` → 33 suítes, 345 testes; `tsc` sem erros novos; lint sem avisos novos.
