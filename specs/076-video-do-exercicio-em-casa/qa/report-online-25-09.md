# QA Online (produção) — atividade 076

**Data:** 25/09/2026 · **Alvo:** https://bpr.clinic (produção, com pacientes reais)
**Janela de medição:** 09:10Z → 09:18Z — mesmo build do começo ao fim.

**Veredito: aprovado, com 2 ressalvas (nenhuma é falha de segurança).**

19 cenários aprovados, 0 reprovados, 11 fora de alcance.

## Qual código está no ar — confirmado pelo Coolify, não pelo `buildDate`

A lição da 075 foi aplicada antes de medir qualquer coisa.

    GET /api/v1/deployments/applications/o9plir7dhgskyng8athrp1ec
    1299  230bcd95  finished  2026-09-25T09:00:44Z -> 2026-09-25T09:08:06Z  (webhook)
    1298  c358453e  finished  2026-09-25T08:37:04Z -> 2026-09-25T08:44:47Z  (webhook)
    1297  c4a6df72  finished  2026-09-25T07:20:59Z -> 2026-09-25T07:36:43Z  (webhook)

    GET https://bpr.clinic/version.json  ->  200
    last-modified: Fri, 25 Sep 2026 09:06:57 GMT
    { "buildDate": "2026-09-25T09:02:11.783Z" }

O `buildDate` 09:02:11Z cai **dentro** da janela do deployment 1299 (09:00:44 → 09:08:06), e
depois do fim do 1298 (08:44:47). O `last-modified` 09:06:57 fecha: o arquivo foi escrito durante
o 1299. Nada `in_progress` atrás dele, no começo e no fim da medição. **O commit no ar é
`230bcd95` (PR #114).**

Pela árvore: `230bcd95` contém `10608d04` (T-1, o commit que criou o modelo). O `c4a6df72`
(deployment 1297) **não** contém — ou seja, o schema entrou em produção com o deployment 1298.

## O schema chegou

Log do container em produção (API do Coolify, `/api/v1/applications/<uuid>/logs`):

    [start.sh] Syncing database schema...
    Prisma schema loaded from prisma/schema.prisma
    Datasource "db": PostgreSQL database "bpr_clinic", schema "public" at "86.48.18.88:5490"

    The database is already in sync with the Prisma schema.

    [start.sh] Checking for bootstrap admin user...

**A frase é "already in sync", não "now in sync"** — e isso é a notícia boa, não a ruim. "Now in
sync" é o que o `db push` imprime quando **aplicou** alguma coisa; "already in sync" é o que ele
imprime quando comparou o schema inteiro — `ExerciseSubmission` incluída — com o banco e **não
achou diferença nenhuma**. Quem aplicou foi o deployment 1298. Não há erro depois da linha.

Prova funcional, que vale mais que o log (cenário 14): a rota do paciente responde **200** com
sessão. Se a tabela não existisse, o Prisma devolveria 500 ali.

## Cenários

### 1 a 8 — as rotas novas existem e se defendem sozinhas

Sem credencial, e com `Bearer` forjado (que **atravessa** o middleware: `/api/patient` e
`/api/exercise-submissions` estão em `MOBILE_API_PREFIXES`):

| método | rota | sem credencial | `Bearer` forjado |
|---|---|---|---|
| GET | `/api/patient/exercise-submissions` | 307 → /login | **401** |
| POST | `/api/patient/exercise-submissions` | 307 → /login | **401** |
| PUT | `/api/patient/exercise-submissions` | 307 → /login | 405 |
| DELETE | `/api/patient/exercise-submissions/<id>` | 307 → /login | **401** |
| GET | `/api/admin/exercise-submissions` | 307 → /login | 307 → /login |
| POST | `/api/admin/exercise-submissions/<id>/review` | 307 → /login | 307 → /login |
| GET | `/api/exercise-submissions/<id>/file` | 307 → /login | **404** (ver ressalva 1) |
| PUT | `/api/exercise-submissions/<id>/file` | 307 → /login | 405 |

    === algum 500?                    ==> 0 ocorrencia(s)
    === algum 200 sem credencial?     ==> 0 ocorrencia(s)
    === distribuicao: 10x 307   3x 401   1x 404   2x 405

Corpo do 401, idêntico em todas as rotas de paciente:

    ### GET /api/patient/exercise-submissions
    status=401 size=24 ct=application/json
    -- body: {"error":"Unauthorized"}

**O ponto que mais importa, e que era o furo da 075:** o `Bearer` forjado passa pelo middleware e
a rota se defende sozinha. Testado com lixo puro (`Bearer nao-e-um-token`) **e** com um JWT de
estrutura válida e assinatura falsa, com `role: PATIENT` e `clinicType: CLINIC` no payload —
exatamente os campos que o middleware lê sem verificar.

### 9 — as rotas estão mesmo registradas (405 contra 404)

    ### PUT /api/patient/exercise-submissions      status=405 size=0
    ### PUT /api/exercise-submissions/<id>/file    status=405 size=0
    ### GET /api/patient/exercise-submissions-que-nao-existe   status=404 size=24820 ct=text/html
    ### GET /api/exercise-submissions/<id>/file    status=404 size=9     ct=text/plain

405 com corpo vazio = a rota existe e o verbo não. 404 com 24 KB de HTML = rota inexistente. O
404 de **9 bytes em `text/plain`** do `/file` é o `new NextResponse("Not Found", { status: 404 })`
escrito na própria rota — ou seja, ela rodou.

### 10 — corpo malformado, com `Bearer` forjado para atravessar o middleware

| corpo enviado | resposta |
|---|---|
| POST sem corpo, sem `Content-Type` | 401 |
| POST JSON quebrado | 401 |
| `application/json` com corpo multipart | 401 |
| multipart vazio / boundary inválido | 401 |
| `text/plain` | 401 |
| `.exe` renomeado para `video.mp4` | 401 |
| DELETE com corpo JSON quebrado | 401 |
| POST review sem corpo / JSON quebrado | 307 → /login |
| GET admin `?status=%%%&take=-1&patientId[]=1` | 307 → /login |
| GET patient `?take=-1&status=%%%` | 401 |

**Nenhum 500.** O gate responde antes do parse.

### 11 — corpo grande e ids hostis

    ### POST 1 MB de lixo binario (bearer lixo)        status=401 size=24
    ### GET /file com id de path traversal (..%2f..)   status=400 (Cloudflare barra antes)
    ### GET /file com id vazio (//file)                status=404 size=24802 ct=text/html
    ### DELETE com id gigante (2 KB de 'a')            status=401 size=24
    ### HEAD /api/patient/exercise-submissions         status=401 size=0
    ### GET /file com id unicode                       status=404 size=9 ct=text/plain

### 12 — nenhuma resposta vaza o R2

30 respostas capturadas, 23 292 bytes no total:

      r2.dev                     ocorrencias: 0
      cloudflarestorage          ocorrencias: 0
      bpr-clinic-media           ocorrencias: 0   (nome real do bucket)
      media.bpr.clinic           ocorrencias: 0   (R2_PUBLIC_URL real)
      0b4f069f                   ocorrencias: 0   (R2_ACCOUNT_ID real)
      storageKey / R2_ / AKIA / signedUrl / presigned   ocorrencias: 0

As 15 ocorrências de `exercise-submissions/c` são o `callbackUrl` que o próprio middleware devolve
no redirect — o id que o QA mandou, ecoado de volta. Não é chave de R2.

### 13 — o host público do R2 não enumera nada

    GET https://media.bpr.clinic/                                     404
    GET https://media.bpr.clinic/exercise-submissions/                404
    GET https://media.bpr.clinic/exercise-submissions/<id-falso>.mp4  404
    GET https://media.bpr.clinic/?list-type=2&prefix=exercise-submissions/  404

### 14 — a rota do paciente funciona de verdade (e a tabela existe)

Pelo navegador, com a sessão que já estava no perfil. **Somente GET.**

    await fetch('/api/patient/exercise-submissions', { credentials: 'include' })

    { "status": 200, "contentType": "application/json", "bytes": 42,
      "body": "{\"submissions\":[],\"maxDurationSeconds\":60}" }

200 e não 500 → a tabela existe em produção. `maxDurationSeconds: 60` → o limite de 1 minuto está
no ar, vindo do servidor. Nenhuma URL de R2 no corpo.

### 15 a 17 — paciente não lê a fila da clínica

| rota | resposta |
|---|---|
| `GET /api/admin/exercise-submissions` | **403** `{"error":"Forbidden"}` |
| `GET /api/admin/exercise-submissions?status=pending` | **403** |
| `GET /api/admin/pending-count` | **403** |
| `GET /api/exercise-submissions/<id-falso>/file` | **404** |

### 18 — CORS: o `DELETE` está lá

Era a ressalva da 075. Preflight com `Origin: http://localhost:8081`, 204 nas quatro rotas:

    -- access-control-allow-methods: GET, POST, PATCH, DELETE, OPTIONS

### 19 — console das páginas que dá para abrir

`/staff-login`: **zero erro, zero warning da aplicação** (TTFB 224ms, FCP/LCP 0,40s).
`/dashboard`: **zero erro, zero warning.**
`/login` devolveu 403 com 4 erros — todos do interstitial da Cloudflare, já documentado na 075.

### 20 — a rota do resumo diário existe, e nenhum e-mail saiu

    ### GET /api/cron/daily-report            status=405 size=0
    ### GET /api/cron/rota-que-nao-existe     status=404 size=24801 ct=text/html

`GET` num handler que só exporta `POST` devolve 405 **sem executar o handler**. Nenhum POST foi
feito — o disparo de e-mail não foi tocado.

## As ressalvas

### 1. O `/file` responde 404 onde o combinado dizia 401

É de propósito e está escrito na rota: *"404 e não 403: um 403 confirmaria que o envio existe"*.
O que importava — nunca 200, nunca 500 — está cumprido. Efeito colateral: o app não distingue
"sessão expirou" de "vídeo não existe".

### 2. O 405 vaza que a rota existe, antes de autenticar

Comportamento padrão do Next.js, vale para o app inteiro, não é regressão da 076. Registrado
porque permite enumerar rotas sem conta.

## Fora de alcance, e por quê

QA em produção é caixa-preta e produção tem paciente real. Onze cenários exigem sessão de
terapeuta, escrita no banco, upload real ou aparelho: T-1 (upload, órfão, tipo real), T-2
(paciente A × B, apagar revisado, `patient_only`, impersonação, teto, fila cross-clinic, rate
limit), T-5 inteira, T-6 inteira (`POST /api/cron/daily-report` manda e-mail de verdade — **não
chamei**), T-3 e T-4 (exigem iPhone).

## Achado fora do escopo da 076

    [seed-guides] error Error: Cannot find module 'iobuffer'
    Require stack: /app/node_modules/fast-png/lib/PngDecoder.js <- jspdf <- scripts/seed-lead-magnet-guides.js
    [start.sh] guide seed warning — check logs

`iobuffer` é dependência transitiva do `fast-png` (via `jspdf`) e não está no runner. O seed dos
guias de lead-magnet não roda desde então, e **o deploy segue verde**.

## Segurança do próprio QA

Nenhum paciente real tocado, nenhum login feito, nenhum POST/PUT/PATCH/DELETE em handler
autenticado, nenhum upload, nenhuma linha escrita, nenhum e-mail disparado. A sessão existente no
navegador é a conta do próprio Bruno e foi usada **apenas para GET**. Todos os ids são falsos.

**Evidência:** `qa/screenshots/online-25-09-staff-login-console-limpo.png` e
`qa/screenshots/online-25-09-dashboard-console-limpo.png`, mais os outputs colados acima.
