# T-1: API de histórico de outcome measures (série temporal)

**Status:** pendente
**Depende de:** nenhuma

## Objetivo
Expor a **série histórica** de outcome measures do paciente autenticado — não só o
último registro — para alimentar os gráficos. O `GET` atual (latest) continua funcionando
como está.

## Contexto
- `PatientOutcomeMeasure` já é append-only (`recordedAt` por registro).
- `GET /api/patient/outcome-measures` hoje faz `findFirst(desc)` e é usado pelo formulário
  para pré-preencher — **não alterar esse comportamento**.
- Auth: `getRequestSession(request)` (dual-auth: sessão web ou token do app).

## Passos
1. Adicionar suporte a histórico sem quebrar o latest. Opção escolhida: **query param**
   `?history=true` (ou `&range=30d|90d|all`) no `GET` existente — quando presente, devolve
   `{ series: [...] }`; sem ele, mantém `{ measures: {...} }` como hoje.
2. `series` = registros do paciente ordenados por `recordedAt` **ascendente**, cada item:
   `{ recordedAt, vasScore, faamAdlPercent, faamSportPercent, overallFunction }`.
3. Aplicar `range` no `where` (`recordedAt >= corte`) quando fornecido; default `all`.
4. Manter o filtro por `patientId` do usuário da sessão (nunca expor de outro paciente).
5. Resposta vazia bem-definida: `{ series: [] }` quando não há registros.

## Arquivos afetados
- `app/api/patient/outcome-measures/route.ts` (estender o `GET`)

## Critérios de aceite
- [ ] `GET` sem params devolve exatamente o mesmo shape de hoje (`measures` = latest).
- [ ] `GET ?history=true` devolve `series` ordenada por `recordedAt` asc.
- [ ] `range=30d|90d|all` filtra corretamente; default `all`.
- [ ] Sempre restrito ao paciente da sessão; sem sessão → 401.
- [ ] Paciente sem registros → `{ series: [] }` (200), sem erro.
