# QA Report — T-1: Cálculo de streak de adesão

**Data:** 23/09/2026
**Resultado geral:** ⚠️ aprovado com ressalva (ver cenário 6)

## Resumo

| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | Item liberado, 4 dias sem log, threshold 3 → aparece com `daysWithoutActivity: 4` | API | ✅ |
| 2 | Mesmo paciente loga ontem → não aparece (streak resetado) | API | ✅ |
| 3 | Protocolo `SENT_TO_PATIENT` mas nenhum item liberado ainda → não aparece | API | ✅ |
| 4 | Protocolo só `DRAFT` → nunca aparece | API | ✅ |
| 5 | Isolamento por clínica (Clínica A nunca vê paciente da B) | API | ✅ |
| 6 | Sem sessão / sessão `PATIENT` → 401/403 | API | ⚠️ ver detalhe |

`tsc --noEmit` e `eslint` nos 4 arquivos novos/tocados: ✅ limpos.

## Ambiente

- Servidor dev local (`npm run dev`, porta 4000) contra `bpr_clinic_local`.
- **Achado operacional (não é bug de código):** o processo de dev já estava rodando desde antes de `app/api/admin/adherence/falling-behind/route.ts` existir no disco (server iniciado 08:24, rota criada 08:36) e por isso devolvia 404 para a rota nova. Precisei derrubar o processo antigo (PID 31216) e subir um novo (`npm run dev` em background) para o Next.js compilar a rota. Depois disso tudo funcionou normalmente. Registro isso só porque pode confundir quem for rodar QA de T-2/T-3 depois — sempre reiniciar o dev server depois de adicionar uma rota nova.
- Sessões reais via `next-auth/jwt encode()` + cookie `next-auth.session-token`, mesma técnica já usada em `scripts/qa/mint-session-cookie.cjs`. Confirmado que o cookie funciona batendo antes numa rota-irmã já existente (`GET /api/admin/adherence/today`) com a sessão de admin — 200 OK.
- Fixtures criadas com `scripts/qa/qa071t1-fixtures.cjs` (script novo, mantido no repo seguindo a convenção de `scripts/qa/*-fixtures.cjs` já existente no projeto) e removidas com `scripts/qa/qa071t1-cleanup.cjs`. Todo dado rotulado `qa071t1-*` (clínicas, e-mails, título de protocolo).

## Detalhes

### 1. Item liberado, 4 dias sem log, threshold 3 → `daysWithoutActivity: 4` ✅

Fixture: Clínica A, paciente `qa071t1-patient1-streak`, protocolo `SENT_TO_PATIENT` iniciado há 60 dias, 1 item `HOME_EXERCISE` com `startWeek:1, endWeek:null` (liberado indefinidamente), 1 `ExerciseCompletionLog` datado de 4 dias atrás.

**Achado de fixture corrigido durante o teste (não é bug do código sob teste):** minha primeira tentativa de gravar `completedDate` usando meia-noite local (`setHours(0,0,0,0)`) resultou em `daysWithoutActivity: 5` em vez de 4, porque `ExerciseCompletionLog.completedDate` é `@db.Date` e o write path real do projeto (`app/api/patient/protocol/route.ts:169`) sempre grava como meia-noite UTC explícita (formato `T00:00:00.000Z`), justamente para evitar esse truncamento. Corrigi a fixture para usar o mesmo padrão do código real; documentei isso no próprio script (`completedDateDaysAgo`) para quem reusar.

**Comando:**
```
curl -s -i "http://localhost:4000/api/admin/adherence/falling-behind" \
  -H "Cookie: next-auth.session-token=<jwt admin clínica A>"
```
**Resposta:**
```
HTTP/1.1 200 OK
content-type: application/json

{"patients":[{"patientId":"cmudsn90j0004xzp43k2bugqt","name":"QA071T1 patient1-streak (delete me)","daysWithoutActivity":4,"hasNote":false}]}
```
Único item na lista — confirma de quebra que os pacientes das fixtures dos cenários 3 e 4 (mesma clínica) não aparecem.

### 2. Mesmo paciente loga ontem → não aparece ✅

Inserido um segundo `ExerciseCompletionLog` para o mesmo paciente/item datado de ontem (mesmo padrão UTC-midnight).

**Resposta:**
```
HTTP/1.1 200 OK
{"patients":[]}
```
Streak resetado corretamente — o paciente sai da lista assim que há log mais recente que o threshold.

### 3. Protocolo `SENT_TO_PATIENT` sem item liberado ainda → não aparece ✅

Fixture: paciente `qa071t1-patient3-notlib`, protocolo `SENT_TO_PATIENT`, único item com `startWeek: 99` (nunca liberado na janela atual), sem nenhum log.

Estado confirmado por SELECT direto:
```json
{"status":"SENT_TO_PATIENT","items":[{"startWeek":99,"endWeek":null,"itemType":"HOME_EXERCISE"}]}
```
Nunca apareceu nas respostas acima (lista da Clínica A só trouxe `patient1` no cenário 1, e ficou vazia no cenário 2) — `getDaysWithoutActivity` retorna `null` quando não há item liberado, exatamente como o código faz (`if (!hasLiberatedItem) return null`).

### 4. Protocolo só `DRAFT` → nunca aparece ✅

Fixture: paciente `qa071t1-patient4-draft`, protocolo com `status: DRAFT` (nunca `SENT_TO_PATIENT`).

Estado confirmado por SELECT direto:
```json
{"status":"DRAFT","items":[{"startWeek":1,"itemType":"HOME_EXERCISE"}]}
```
A query em `getClinicPatientsFallingBehind` já filtra por protocolo `SENT_TO_PATIENT` — paciente nunca entra nem na busca inicial. Nunca apareceu nas respostas.

### 5. Isolamento por clínica ✅

Fixture adicional: Clínica B, paciente `qa071t1-patientB-streak`, protocolo `SENT_TO_PATIENT` iniciado há 60 dias, item liberado desde então, nunca logado (`daysWithoutActivity` esperado ~60).

**Admin da Clínica B vê seu próprio paciente atrasado:**
```
curl -s -i ".../falling-behind" -H "Cookie: next-auth.session-token=<jwt admin clínica B>"

HTTP/1.1 200 OK
{"patients":[{"patientId":"cmudsn91r000oxzp43caxcb1x","name":"QA071T1 patientB-streak (delete me)","daysWithoutActivity":60,"hasNote":false}]}
```

**Admin da Clínica A, consultado logo em seguida, não vê o paciente da Clínica B** (e nem o próprio patient1, já resetado pelo cenário 2):
```
curl -s -i ".../falling-behind" -H "Cookie: next-auth.session-token=<jwt admin clínica A>"

HTTP/1.1 200 OK
{"patients":[]}
```
Isolamento de tenant confirmado nos dois sentidos — `getClinicPatientsFallingBehind` está corretamente escopado por `clinicId` (tanto na query de `prisma.user.findMany` quanto no `knownClinicId` passado a `getDaysWithoutActivity`).

### 6. Sem sessão / sessão `PATIENT` → 401/403 ⚠️

**Sessão `PATIENT` (paciente `patient1`):**
```
curl -s -i ".../falling-behind" -H "Cookie: next-auth.session-token=<jwt patient1>"

HTTP/1.1 403 Forbidden
content-type: application/json
{"error":"Forbidden"}
```
Bate exatamente com o esperado — bloqueado pelo `middleware.ts` (linha ~395) antes mesmo de chegar na rota, porque `/api/admin/adherence/falling-behind` não está na allowlist `PATIENT_ALLOWED_ADMIN_APIS`.

**Sem sessão (sem cookie):**
```
curl -s -i ".../falling-behind"

HTTP/1.1 307 Temporary Redirect
location: /login?callbackUrl=%2Fapi%2Fadmin%2Fadherence%2Ffalling-behind
```
Não é um 401/403 JSON literal — é um redirect 307 para `/login`, que bloqueia efetivamente o acesso (nenhum dado vaza), mas não bate com o texto exato do critério do `qa-spec.md`.

**Isto não é uma regressão de T-1** — é o comportamento padrão do `middleware.ts` do projeto para toda rota sob `/api/admin` sem token (linhas 308-319: sem token, redireciona pro login), aplicado igualmente antes de qualquer rota específica rodar. Confirmei rodando o mesmo teste na rota-irmã já existente há tempos em produção, `GET /api/admin/adherence/today`:
```
curl -s -i "http://localhost:4000/api/admin/adherence/today"
HTTP/1.1 307 Temporary Redirect
location: /login?callbackUrl=%2Fapi%2Fadmin%2Fadherence%2Ftoday
```
Mesmo comportamento, mesma rota-mãe. Também testei um token adulterado/inválido — mesmo resultado (307, decodifica como "sem token").

Marco isso como aprovado com ressalva e não como reprovado porque:
- O acesso é efetivamente bloqueado (nenhum dado de paciente retorna).
- É um padrão consistente e intencional em todo o `/api/admin` do projeto, não algo que T-1 introduziu ou poderia corrigir isoladamente sem alterar o middleware compartilhado (fora do escopo desta tarefa).
- Ainda assim, é uma divergência real do texto do `qa-spec.md` ("401/403"), então registro para quem decidir se o `qa-spec.md` deveria refletir o padrão real do projeto (307 redirect para requisição sem sessão em rota `/api/admin`) em vez de 401.

## Erros de console

Não aplicável — este QA cobriu apenas API (T-1 não tem UI; o card fica para T-2).

## Falhas e recomendações

Nenhuma falha no código sob teste. Os dois pontos de atenção encontrados durante o QA:

1. **Fixture com bug de timezone (meu erro, corrigido):** ao gravar `ExerciseCompletionLog.completedDate` (`@db.Date`) usando meia-noite local em vez de meia-noite UTC explícita, o valor persistido ficava um dia atrás do esperado. Corrigido no script de fixtures para espelhar o write path real do projeto. Não afeta o código de produção — só a forma de gerar dado de teste.
2. **Cenário 6 (sem sessão) devolve 307, não 401/403 literal** — comportamento herdado do `middleware.ts` compartilhado por todas as rotas `/api/admin`, não específico de T-1. Sugiro só alinhar o texto do `qa-spec.md` a esse padrão (ou decidir, à parte, se as rotas `/api/admin` deveriam devolver 401 JSON quando chamadas sem sessão via fetch/curl em vez de redirect — isso teria impacto em todas as rotas admin do projeto, não só nesta, então não é algo para resolver dentro de T-1).

## Limpeza

Todas as fixtures (`qa071t1-*`: 2 clínicas, 6 usuários, 4 protocolos, 2 logs de conclusão) foram removidas ao final via `scripts/qa/qa071t1-cleanup.cjs`. Confirmado por SELECT direto (via `prisma.$queryRawUnsafe`) que não resta nenhuma linha com slug/email iniciando em `qa071t1-` em `Clinic` ou `User`, nem protocolo com título `QA071T1*`.
