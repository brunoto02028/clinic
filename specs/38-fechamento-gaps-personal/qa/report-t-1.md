# QA Report — T-1: Paywall no servidor

**Data:** 2026-09-13
**Resultado geral:** ✅ aprovado

## Ambiente de teste
- Dev server local: `http://localhost:4000` (já rodando, não precisou subir).
- Banco local: `postgresql://postgres:postgres@localhost:5432/bpr_clinic_local` (via `.env`).
- Paciente de teste criado diretamente via Prisma (setup de teste, não ação de produto): `qa38.t1.patient@example.test` / `QaTest123!`, `role: PATIENT`, tenant `Bruno Physical Rehabilitation` (clínica já existente no banco local).
- Dois planos de teste criados (`MembershipPlan`): `qa38-bare-plan` (features: só `mod_education`, não inclui nenhum dos 3 módulos clínicos) e `qa38-full-plan` (features: `mod_treatment`, `mod_exercises`, `mod_records`).
- Estado do paciente (assinatura ativa, `moduleOverrides`, `fullAccessOverride`) foi alternado via script Prisma entre cada bloco de teste, sem precisar logar de novo — a guarda recalcula o acesso a cada request, direto do banco.
- Autenticação:
  - `/api/patient/protocol` e `/api/exercises` estão nos `MOBILE_API_PREFIXES` do `middleware.ts`, então autenticam por Bearer token (`/api/auth/mobile/login`).
  - `/api/soap-notes` **não** está nesses prefixos — o middleware trata como rota "web" e redireciona (307) pra `/login` quando só há Bearer token, sem cookie de sessão. Testado com sessão web via cookie (`/api/auth/csrf` + `/api/auth/callback/credentials`) em vez de Bearer. Isso é comportamento pré-existente do middleware (fora do escopo do T-1) — **não é regressão desta tarefa**, mas registra aqui porque afeta como um cliente mobile chamaria essa rota (hoje não conseguiria, com ou sem paywall).
- Todos os testes abaixo foram feitos com `curl` real contra o servidor rodando; nenhum resultado foi simulado.
- Paciente, planos e assinaturas de teste foram removidos do banco ao final (cleanup); nenhum script de setup ficou no repositório.

## Resumo
| # | Cenário | Módulo | Resultado |
|---|---------|--------|-----------|
| 1 | Sem acesso ao módulo → 403, sem dado no corpo | mod_treatment | ✅ |
| 1 | Sem acesso ao módulo → 403, sem dado no corpo | mod_exercises | ✅ |
| 1 | Sem acesso ao módulo → 403, sem dado no corpo | mod_records | ✅ |
| 2 | Com acesso (plano inclui o módulo) → funciona normal | mod_treatment | ✅ |
| 2 | Com acesso (plano inclui o módulo) → funciona normal | mod_exercises | ✅ |
| 2 | Com acesso (plano inclui o módulo) → funciona normal | mod_records | ✅ |
| 3 | `fullAccessOverride` libera mesmo sem o módulo no plano | mod_treatment | ✅ |
| 3 | `fullAccessOverride` libera mesmo sem o módulo no plano | mod_exercises | ✅ |
| 3 | `fullAccessOverride` libera mesmo sem o módulo no plano | mod_records | ✅ |
| 4 | Override manual do admin (unlock) libera mesmo sem o plano | mod_treatment | ✅ |
| 4 | Override manual do admin (unlock) libera mesmo sem o plano | mod_exercises | ✅ |
| 4 | Override manual do admin (unlock) libera mesmo sem o plano | mod_records | ✅ |
| — | Override é por módulo (não vaza pros outros 2, testado como controle) | todos | ✅ |

15/15 sub-cenários aprovados (5 cenários da qa-spec × 3 módulos, cenário 5 sendo a repetição pedida).

## Detalhes

### 1. API — sem acesso ao módulo, bloqueado (mod_treatment) ✅
Estado: paciente sem assinatura, sem overrides, sem pacote pago.
- **Comando:** `curl -s -w "\nHTTP_STATUS:%{http_code}\n" http://localhost:4000/api/patient/protocol -H "Authorization: Bearer $TOKEN"`
- **Esperado:** 403, sem dado no corpo.
- **Obtido:**
  ```
  {"error":"Treatment Plan is not included in your plan"}
  HTTP_STATUS:403
  ```

### 1. API — sem acesso ao módulo, bloqueado (mod_exercises) ✅
- **Comando:** `curl -s -w "\nHTTP_STATUS:%{http_code}\n" http://localhost:4000/api/exercises -H "Authorization: Bearer $TOKEN"`
- **Obtido:**
  ```
  {"error":"My Exercises is not included in your plan"}
  HTTP_STATUS:403
  ```

### 1. API — sem acesso ao módulo, bloqueado (mod_records) ✅
- **Comando:** `curl -s -w "\nHTTP_STATUS:%{http_code}\n" http://localhost:4000/api/soap-notes -H "Authorization: Bearer $TOKEN"`
- **Obtido (1ª tentativa, via Bearer):**
  ```
  /login?callbackUrl=%2Fapi%2Fsoap-notes
  HTTP_STATUS:307
  ```
  (middleware não reconhece Bearer nessa rota — ver nota no Ambiente de teste). Refeito com cookie de sessão web:
- **Comando:** `curl -s -b qa38-cookies.txt -w "\nHTTP_STATUS:%{http_code}\n" http://localhost:4000/api/soap-notes`
- **Obtido:**
  ```
  {"error":"My Records is not included in your plan"}
  HTTP_STATUS:403
  ```

Em nenhum dos 3 casos o corpo da resposta 403 vazou qualquer dado do módulo — só uma mensagem curta.

### 2. API — com acesso, funciona normal (mod_treatment, mod_exercises, mod_records) ✅
Estado: assinatura ativa no `qa38-full-plan` (features: `mod_treatment`, `mod_exercises`, `mod_records`).
- **Comandos e resultados** (cookie de sessão, mesmo paciente):
  ```
  GET /api/patient/protocol → {"protocols":[]}          HTTP_STATUS:200
  GET /api/exercises        → {"prescriptions":[]}      HTTP_STATUS:200
  GET /api/soap-notes       → {"soapNotes":[]}           HTTP_STATUS:200
  ```
  Arrays vazios porque o paciente de teste não tem protocolos/prescrições/notas cadastrados — o que importa é que a guarda deixou passar (200), sem bloquear.

### 3. API — Full Access override dá acesso mesmo assim ✅
Estado: `fullAccessOverride: true`, sem nenhuma assinatura ativa.
- **Comandos e resultados:**
  ```
  GET /api/patient/protocol → {"protocols":[]}      HTTP_STATUS:200
  GET /api/exercises        → {"prescriptions":[]}  HTTP_STATUS:200
  GET /api/soap-notes       → {"soapNotes":[]}       HTTP_STATUS:200
  ```

### 4. API — override manual do admin (unlock) libera mesmo sem o plano ✅
Estado: assinatura ativa no `qa38-bare-plan` (features: só `mod_education`, nenhum dos 3 módulos) + `moduleOverrides: { "<mod>": true }` setado um por vez.

**mod_treatment unlocked:**
```
GET /api/patient/protocol → {"protocols":[]}                                       HTTP_STATUS:200  (liberado)
GET /api/exercises        → {"error":"My Exercises is not included in your plan"}  HTTP_STATUS:403  (controle: continua bloqueado)
GET /api/soap-notes       → {"error":"My Records is not included in your plan"}    HTTP_STATUS:403  (controle: continua bloqueado)
```

**mod_exercises unlocked:**
```
GET /api/exercises        → {"prescriptions":[]}                                     HTTP_STATUS:200  (liberado)
GET /api/patient/protocol → {"error":"Treatment Plan is not included in your plan"}  HTTP_STATUS:403  (controle)
GET /api/soap-notes       → {"error":"My Records is not included in your plan"}      HTTP_STATUS:403  (controle)
```

**mod_records unlocked:**
```
GET /api/soap-notes       → {"soapNotes":[]}                                         HTTP_STATUS:200  (liberado)
GET /api/patient/protocol → {"error":"Treatment Plan is not included in your plan"}  HTTP_STATUS:403  (controle)
GET /api/exercises        → {"error":"My Exercises is not included in your plan"}    HTTP_STATUS:403  (controle)
```

Os testes de controle (os outros 2 módulos continuando 403 enquanto só o módulo unlocked libera) confirmam que a guarda opera por módulo, não libera geral por engano.

### 5. Repetição pra mod_exercises e mod_records
Já incorporada nos blocos acima — cada cenário (1 a 4) foi rodado pros 3 módulos, não só `mod_treatment`.

## Erros de console
Não aplicável — este QA foi 100% via API/curl (validação de servidor), sem navegação em browser. Nenhum log de erro inesperado apareceu na saída dos comandos ou nas respostas.

## Falhas e recomendações
Nenhuma falha na lógica do paywall em si — os 4 critérios de aceite da tarefa foram confirmados com evidência real:
- [x] Paciente sem o módulo no plano → 403, sem dado.
- [x] Paciente com o módulo → funciona normal.
- [x] `fullAccessOverride` continua liberando tudo.
- [x] Override manual do admin (unlock) continua sendo respeitado pela nova guarda.

**Observação fora do escopo do critério de aceite, mas relevante para quem for consumir a API pelo app mobile:** `/api/soap-notes` não está na lista `MOBILE_API_PREFIXES` do `middleware.ts` (linha ~45), então uma chamada com só Bearer token é redirecionada (307) pra `/login` antes de chegar no route handler — a guarda de módulo nem é alcançada nesse caminho. Como o app mobile hoje aparentemente não usa records/SOAP notes diretamente (é tela web `/dashboard/records`), isso não bloqueia a aprovação do T-1, mas vale confirmar com quem decide o roadmap do app se `mod_records` via mobile é esperado — se for, essa rota precisaria entrar nos prefixos mobile do middleware (ajuste fora do escopo desta tarefa).

---

# Adendo QA — T-1: Correções pós-code-review (gaps nas rotas irmãs)

**Data:** 2026-09-13
**Resultado geral:** ✅ aprovado

## Contexto
O code review da primeira versão do T-1 achou que a guarda só cobria os endpoints de LISTAGEM (`GET /api/patient/protocol`, `GET /api/exercises`, `GET /api/soap-notes`) — o mesmo dado clínico continuava acessível por rotas irmãs sem a guarda. Correções aplicadas, todas reaproveitando `assertModuleAccess()`:
1. `app/api/exercises/route.ts` PATCH (marcar exercício completo/desfazer) → guarda `mod_exercises`.
2. `app/api/patient/protocol/route.ts` PATCH (marcar item do protocolo completo/anotar) → guarda `mod_treatment`.
3. `app/api/soap-notes/[id]/route.ts` GET (nota clínica individual) → guarda `mod_records` quando `tenantAccess.actor.role === "PATIENT"`.
4. `app/api/soap-notes/[id]/pdf/route.ts` GET (exportação PDF/HTML da nota) → mesma guarda do item 3.
5. `app/api/exercises/route.ts` GET: a chamada de `assertModuleAccess` estava fora do try/catch principal — movida pra dentro, com catch específico pra `AccessError` retornando 403 em vez de cair no catch genérico (500).

## Ambiente de teste
- Dev server local: `http://localhost:4000` (já rodando).
- Paciente de teste recriado via Prisma direto (`qa38.t1.patient@example.test`), sem assinatura/plano/treatment pago ativo — módulo liberado/bloqueado só via `moduleOverrides`.
- Staff de teste temporário (`qa38.t1.staff@example.test`, THERAPIST, mesma clínica) só para o cenário f.
- Dados clínicos reais vinculados ao paciente: 1 `Exercise` + 1 `ExercisePrescription`, 1 `TreatmentProtocol` (SENT_TO_PATIENT) + 1 `ProtocolItem`, 1 `SOAPNote`.
- `curl` real contra o servidor rodando; todo dado de teste removido ao final (verificado programaticamente).

## Resumo
| # | Cenário | Rota | Resultado |
|---|---------|------|-----------|
| a | Paciente SEM `mod_exercises`, PATCH numa prescription real dele | `PATCH /api/exercises` | ✅ 403, `completedCount` não mudou |
| b | Mesmo paciente COM `mod_exercises` (override) | `PATCH /api/exercises` | ✅ 200, `completedCount` incrementou (0→1) |
| c | Paciente SEM `mod_treatment`, PATCH num protocolItem real dele | `PATCH /api/patient/protocol` | ✅ 403, nada mudou |
| c | Mesmo paciente COM `mod_treatment` (override) | `PATCH /api/patient/protocol` | ✅ 200, item marcado como completo |
| d | Paciente SEM `mod_records`, nota real dele | `GET /api/soap-notes/<id>` | ✅ 403, sem dado da nota |
| d | Mesmo, sem `mod_records` | `GET /api/soap-notes/<id>/pdf` | ✅ 403, sem HTML/dado clínico |
| e | Mesmo paciente COM `mod_records` (override) | `GET /api/soap-notes/<id>` | ✅ 200, retorna a nota completa |
| e | Mesmo paciente COM `mod_records` | `GET /api/soap-notes/<id>/pdf` | ✅ 200, retorna o HTML da nota |
| f | Staff (THERAPIST) do mesmo tenant, patient SEM `mod_records` | `GET /api/soap-notes/<id>` | ✅ 200, não afetado pela guarda |
| f | Staff, mesma condição | `GET /api/soap-notes/<id>/pdf` | ✅ 200, não afetado pela guarda |

10/10 sub-cenários aprovados.

## Detalhes

### a. PATCH /api/exercises sem `mod_exercises` ✅
`curl -X PATCH http://localhost:4000/api/exercises -H "Authorization: Bearer $TOKEN" -d '{"prescriptionId":"<real-id>","action":"complete"}'` → `{"error":"My Exercises is not included in your plan"}`, `403`. DB confirmado: `completedCount: 0, lastCompletedAt: null` (sem efeito colateral, guarda rodou antes do `update`).

### b. PATCH /api/exercises com `mod_exercises` (override) ✅
Mesmo comando, `moduleOverrides: { mod_exercises: true }` → `200`, `completedCount: 1`, `lastCompletedAt` preenchido.

### c. PATCH /api/patient/protocol sem/com `mod_treatment` ✅
Sem o módulo → `{"error":"Treatment Plan is not included in your plan"}`, `403`, DB sem mudança. Com `moduleOverrides: { mod_treatment: true }` → `200`, `{"success":true,"item":{...,"isCompleted":true,"completedCount":1}}`.

### d. GET /api/soap-notes/<id> e /pdf sem `mod_records` ✅
Ambas retornam `{"error":"My Records is not included in your plan"}`, `403`. Nenhum vazou `subjective/objective/assessment/plan` no corpo.

### e. GET /api/soap-notes/<id> e /pdf com `mod_records` ✅
Com `moduleOverrides: { mod_records: true }`: `/api/soap-notes/<id>` → `200`, `soapNote` completo. `/pdf` → `200`, `Content-Type: text/html`, HTML renderizado com os dados clínicos.

### f. Staff (THERAPIST) não afetado pela guarda nova ✅
Paciente devolvido a `moduleOverrides: {}` (sem nenhum módulo). Login como THERAPIST do mesmo tenant → `GET /api/soap-notes/<id>` e `/pdf` → ambos `200`, nota/HTML completos. Confirma que `if (tenantAccess.actor.role === "PATIENT")` restringe a guarda só ao paciente, sem regressão pra staff.

## Falhas e recomendações
Nenhuma falha encontrada. As 5 correções fecham os gaps do code review: as rotas irmãs que antes vazavam dado clínico sem o módulo no plano agora bloqueiam com 403, sem efeito colateral no banco, e sem regressão para quem tem acesso (plano, override, `fullAccessOverride`, staff).

---

## Segunda rodada de review — consistência do padrão try/catch

Uma segunda passada de code review (focada só nas correções acima) achou 3 pontos, dos quais 1 era real e barato de corrigir:
- **Corrigido:** `GET /api/patient/protocol` tinha um try/catch próprio ao redor de `assertModuleAccess` (padrão diferente das outras 3 rotas guardadas, que deixam o `AccessError` subir pro catch externo). Simplificado pra chamar `assertModuleAccess` direto dentro do try existente, e adicionado `if (err instanceof AccessError) return accessErrorResponse(err)` no catch externo — agora as 4 rotas seguem exatamente o mesmo padrão.
- **Não corrigido (fora de escopo, avaliado e descartado):** sugestão de extrair um helper compartilhado pro par "checar role PATIENT + chamar assertModuleAccess + tratar AccessError no catch" — é só 4 chamadas, e o projeto prioriza código simples e explícito sobre abstração prematura (ver CLAUDE.md do projeto). Se um quinto módulo precisar da mesma guarda no futuro, vale reconsiderar.
- **Não corrigido (fora de escopo, avaliado e descartado):** `soapNoteAccess()` e `assertModuleAccess()` fazem cada um seu próprio `findUnique` no `User` nas rotas de SOAP note — uma query redundante por request de paciente. É a mesma classe de ineficiência já presente (e já aceita) na rota de listagem `/api/soap-notes` aprovada na primeira rodada; corrigir exigiria mudar a assinatura de `getActor`/`soapNoteAccess`, usados por várias outras guardas do projeto — mudança grande demais pro escopo do T-1.

**Verificação da correção:** smoke test manual pós-refactor — paciente de teste descartável sem nenhum módulo, `GET /api/patient/protocol` com Bearer token → `{"error":"Treatment Plan is not included in your plan"}`, `HTTP_STATUS:403` (confirmado que o comportamento não mudou depois da simplificação). Paciente e scripts de teste removidos ao final.
