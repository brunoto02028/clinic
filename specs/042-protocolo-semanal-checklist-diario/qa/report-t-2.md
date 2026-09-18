# QA Report — T-2: API — toggle diário + incluir logs no GET

**Data:** 2026-09-15
**Resultado geral:** ⚠️ aprovado com ressalvas

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | `toggleLog` marca na primeira chamada (item sem log) | API | ✅ |
| 2 | `toggleLog` desmarca na segunda chamada (mesma data) | API | ✅ |
| 3 | `toggleLog` marca de novo na terceira chamada (idempotência do toggle) | API | ✅ |
| 4 | `toggleLog` com `date` explícita (`YYYY-MM-DD`) | API | ✅ |
| 5 | `toggleLog` sem sessão (não autenticado) | API | ✅ |
| 6 | `toggleLog` sem `itemId` | API | ✅ |
| 7 | `toggleLog` com `action` inválida | API | ✅ |
| 8 | `toggleLog` com `itemId` inexistente | API | ✅ |
| 9 | `toggleLog` num `itemId` de outro paciente (posse) | API | ✅ |
| 10 | `GET` do paciente retorna `completionLogs` corretos por item | API | ✅ |
| 11 | `GET` do admin (`/api/admin/patients/[id]/protocol`) retorna `completionLogs` corretos | API | ✅ |
| 12 | `GET` do admin usado de fato pela tela do admin (`/api/admin/patients/[id]`) inclui `completionLogs` | API | ❌ |

## Detalhes

Paciente de teste: `qa.pacientea@example.test` (id `cmtzwjq4f0009xzq8i2t1wcuz`), protocolo
"ACL Reconstruction — Post-Operative Rehabilitation" atribuído via
`POST /api/admin/protocols/[templateId]/assign` para os testes. Item usado:
`cmu2nqzuw0007xz94xiqmvqlr` ("Quad Sets (Isometric)").

### 1-3. Toggle idempotente ✅
```
curl -X POST /api/patient/protocol -d '{"action":"toggleLog","itemId":"..."}'
→ {"success":true,"marked":true,"date":"2026-09-15"}   HTTP 200
curl (mesma chamada de novo)
→ {"success":true,"marked":false,"date":"2026-09-15"}  HTTP 200
curl (mesma chamada de novo)
→ {"success":true,"marked":true,"date":"2026-09-15"}   HTTP 200
```

### 4. Data explícita ✅
```
curl -X POST /api/patient/protocol -d '{"action":"toggleLog","itemId":"...","date":"2026-09-14"}'
→ {"success":true,"marked":true,"date":"2026-09-14"}   HTTP 200
```

### 5-8. Validações ✅
```
sem cookie de sessão → 307 redirect para /login?callbackUrl=... (protegido)
sem itemId           → {"error":"itemId is required"}          HTTP 400
action inválida      → {"error":"Invalid action. Use: toggleLog"} HTTP 400
itemId inexistente   → {"error":"Not found"}                    HTTP 404
```

### 9. Posse cross-patient ✅
Logado como paciente B (`qa.pacientea2@example.test`), tentativa de `toggleLog` num `itemId`
que pertence ao protocolo do paciente A:
```
→ {"error":"Not found"}   HTTP 404
```
Confirmado no banco (via GET admin) que o log do paciente A não foi alterado por essa
tentativa — nenhuma gravação vazou entre pacientes.

### 10-11. GET paciente e GET admin (`/protocol`) ✅
Após marcar `2026-09-14` e `2026-09-15` para o item de teste, ambos os endpoints retornaram:
```
GET /api/patient/protocol                              → completionLogs: [2026-09-15, 2026-09-14]
GET /api/admin/patients/[id]/protocol                   → completionLogs: [2026-09-14, 2026-09-15]
```
Datas batendo em ambos (admin sem limite de 14 dias, paciente com o filtro de 14 dias — ambos
corretos para o cenário testado, que está dentro da janela).

### 12. GET realmente consumido pela tela do admin ❌ (achado importante — ver T-4)
O critério de aceite do T-2 diz "GET do admin retorna as datas certas por item" e isso é
literalmente verdade para `app/api/admin/patients/[id]/protocol/route.ts` (testado acima, item
11). **Mas essa não é a rota que a aba Protocol da tela do admin usa para carregar os itens.**
A tela (`app/admin/patients/[id]/page.tsx`) carrega os protocolos a partir de
`GET /api/admin/patients/[id]` (o endpoint "tudo sobre o paciente", usado em várias abas — ver
`app/api/admin/patients/[id]/route.ts` linhas 64-70), cujo `include` para os itens é:
```ts
items: { orderBy: { sortOrder: "asc" } },
```
sem `completionLogs`. Ou seja: o T-2 adicionou `completionLogs` no GET certo do ponto de vista
do critério de aceite escrito, mas não no GET que a UI do admin realmente consome — resultado
prático: a UI do admin nunca recebe `completionLogs` e a funcionalidade do T-4 (mostrar as
datas marcadas no item) fica sempre vazia, mesmo com dados corretos no banco e no endpoint
"errado". Detalhes e evidência de tela em `report-t-4.md`.

## Erros de console
N/A (tarefa é só API).

## Falhas e recomendações
- **Achado principal:** adicionar `completionLogs` também ao `include.items` da query de
  `treatmentProtocol.findMany` em `app/api/admin/patients/[id]/route.ts` (linhas ~64-70), que é
  o endpoint que efetivamente alimenta a aba Protocol do admin. Sem isso, o trabalho de T-4 na
  UI está correto mas nunca recebe dado para mostrar.
