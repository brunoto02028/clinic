# QA Report — T-1: API de histórico de outcome measures

**Data:** 2026-08-22
**Resultado geral:** APROVADO (7/7)

Auth real: login do paciente `maria.final.email@example.com` no browser; chamadas via
`fetch(..., {credentials:'include'})` na sessão logada. Curl usado nos testes sem sessão.

| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1.1 | GET sem params → latest `{ measures }` | API | APROVADO |
| 1.2 | `?history=true` → `{ series }` asc | API | APROVADO |
| 1.3 | `?history=true&range=30d` filtra | API | APROVADO |
| 1.4 | `?history=true&range=all` → todos | API | APROVADO |
| 1.5 | Paciente sem medidas → `{ series: [] }` | API | APROVADO (por código) |
| 1.6 | Sem sessão → 401 | API | APROVADO (com ressalva) |
| 1.7 | Série só do paciente logado | API | APROVADO |

**1.1** `GET /api/patient/outcome-measures` → 200, shape inalterado:
`{"measures":{"vasScore":3,...,"faamAdlPercent":86,"faamSportPercent":71,"overallFunction":82,"recordedAt":"2026-08-20T..."}}`. Bate com o seed.

**1.2** `?history=true&range=all` → 200, `{series:[...]}` com 6 registros em ordem
**ascendente** por `recordedAt`, campos exatos. Progressão: dor 8→3; ADL 45→86; Sport 30→71;
função 40→82. Idêntica ao seed.

**1.3** `range=30d` → 2 registros; `range=90d` → 5 registros. Corte por data confirmado.

**1.4** `range=all` → 6 registros, sem corte.

**1.5** Por código: sem registros, `findMany` retorna `[]` → `200 {series:[]}` (`route.ts`).

**1.6** Com ressalva. App-token inválido → `401 Unauthorized`. Web sem cookie → `middleware.ts`
intercepta `/api/patient/*` com `307` → `/login?callbackUrl=...` (não chega ao handler).
Ambos negam acesso; o `401` literal só aparece no caminho de token do app.

**1.7** `where:{patientId:user.id}` (id derivado do e-mail da sessão) nos dois modos. Nenhum
param aceita `patientId` externo. Garantido por código.

Console: 0 erros. Rede: chamadas à API todas 200.
