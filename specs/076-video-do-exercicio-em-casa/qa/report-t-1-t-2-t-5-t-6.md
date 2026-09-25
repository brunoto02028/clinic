# QA local — atividade 076 (T-1, T-2, T-5, T-6)

**Data:** 25/09/2026 · **Alvo:** `http://localhost:4076` (este worktree)

| Tarefa | Veredito | Motivo |
|---|---|---|
| **T-1** | **reprovado** | tipo do arquivo validado só pelo MIME declarado pelo cliente |
| **T-2** | **aprovado** | 30 cenários, nenhum 500, nenhum vazamento entre pacientes ou clínicas |
| **T-5** | **reprovado** | "Waiting for you" não recebe o envio; `pending-count` vaza contagens entre clínicas |
| **T-6** | **aprovado com ressalvas** | falha de envio vira "enviado" na auditoria; prévia do admin ≠ e-mail real |
| T-3 / T-4 | — | fora de alcance (exigem aparelho), **não aprovar** |

## Como foi medido

Porta exclusiva confirmada (a 4000 está com outro checkout):

    PID on 4076 = 29124
    CommandLine : node ...\clinic\app_clinic\node_modules\next\dist\server\lib\start-server.js

Servidor com `OUTBOUND_MODE=sink` — **nenhum e-mail saiu**, todos interceptados e logados.

Dois tenants reais, criados só para este QA (`qa076-*@x.test`):

| | clínica A (`qa076-clinic-a`) | clínica B (`qa076-clinic-b`) |
|---|---|---|
| pacientes | `qa076-pa1@x.test`, `qa076-pa2@x.test` | `qa076-pb1@x.test` |
| terapeuta | `qa076-ta@x.test` | `qa076-tb@x.test` |
| admin | `qa076-adm@x.test` | — |

Sessões reais via `POST /api/auth/callback/credentials`. Mídia gerada com ffmpeg e um `.exe` de
verdade (cabeçalho `MZ`). Limpeza completa depois: 2 tenants, 6 usuários, todos os envios, 3
objetos no R2, 5 linhas de AuditLog. Nenhum `db push`, nenhum `migrate dev`, nenhuma DDL — o único
comando de schema foi `migrate diff`, que só imprime SQL.

**Achado de ambiente:** o Playwright chegou com uma sessão viva de `qa-t14-patient@example.com`
(outro worktree, porta 4031) — **cookie de `localhost` é compartilhado entre portas**. Signout
explícito antes de medir. Vale para qualquer QA de UI local.

## T-1 — modelo e armazenamento

| # | Cenário | Resultado |
|---|---|---|
| 1 | envio válido → objeto no R2 sob `exercise-submissions/<patientId>/` | ok |
| 2 | falha no banco depois do upload → sem órfão | ok |
| 3 | tipo não suportado (`.exe` renomeado) → recusado pelo tipo real | **falhou** |
| 4 | `prisma migrate diff` contra `main` → zero DROP | ok |
| 5 | nenhuma resposta contém URL pública do R2 | ok |

**1 — objeto no lugar certo, chave e não URL**

    HTTP/1.1 200 OK
    {"submission":{"id":"cmugqllxy000bxzh0s748lghz","kind":"VIDEO","mimeType":"video/mp4","sizeBytes":15257,"durationSeconds":3,...}}

    R2 bucket=bpr-clinic-media prefix=exercise-submissions/ objetos=2
      exercise-submissions/cmugqitav0003xzs0fx8su6io/1790327216535-o6ypqb.mp4  15257B

**2 — órfão removido** — `storeExerciseSubmission` chamada com `clinicId` inexistente (a FK
estoura **depois** do upload):

    R2 antes : 2 objeto(s)
    prisma:error  Foreign key constraint violated on: `ExerciseSubmission_clinicId_fkey`
    R2 depois: 2 objeto(s)
    VEREDITO: nenhum objeto orfao no R2

**3 — FALHA** — mesmo `.exe`, dois `Content-Type`:

    (a) -F "file=@qa076-fake.exe;type=application/x-msdownload"
    HTTP/1.1 400 Bad Request  {"error":"Send a video (MP4 or MOV) or a photo...","code":"unsupported_type"}

    (b) -F "file=@qa076-fake.exe;filename=inocente.mp4;type=video/mp4"
    HTTP/1.1 200 OK  {"submission":{"kind":"VIDEO","mimeType":"video/mp4","sizeBytes":55,...}}

Bytes gravados no R2 como `.mp4`: `MZ\x90\x00...This program cannot be run in DOS mode.`, servidos
depois com `Content-Type: video/mp4`.

**4 — zero DROP**

    -- AlterEnum / -- AlterTable (WearableConnection) / -- CreateTable "ExerciseSubmission"
    -- CreateIndex (4x) / -- AddForeignKey (5x)
    Ocorrências de DROP: 0

**5 — nenhuma URL do R2** — varredura das 49 respostas capturadas: `r2.dev`, `cloudflarestorage`,
`media.bpr.clinic`, `bpr-clinic-media`, `storageKey`, `R2_PUBLIC` → 0 arquivos com ocorrência.

## T-2 — API

30 cenários, **todos aprovados**. Nenhum 5xx.

| # | Cenário | Obtido |
|---|---|---|
| 1-2 | pa1 envia e lista o próprio | 200 / 1 envio |
| 3-4 | pb1 pede pela prescrição de pa1 / lista os próprios | `{"submissions":[]}` |
| 5 | pa1 envia para a prescrição de pb1 | 404 `Exercise not found` |
| 6-7 | pb1 e pa2 apagam envio de pa1 | 404 |
| 8-9 | THERAPIST no POST / DELETE de paciente | 403 `patient_only` / 404 |
| 10-13 | corpo JSON, corpo lixo, sem arquivo, sem exercício | 400 `bad_request` / `exercise_required` |
| 14 | `durationSeconds=180` | 400 `too_long` |
| 15-16 | foto 11 MB / vídeo 210 MB | 400 `too_large` (o de 210 MB em 1,13 s) |
| 17 | `.exe` com tipo honesto | 400 `unsupported_type` |
| 18-19 | impersonação POST / DELETE | 403 read-only |
| 20 | 13º envio na hora | 429 `rate_limited` (corta exato no 13º) |
| 21-23 | terapeuta B: fila / fila filtrada por paciente de A / review | `[]`, `[]`, 404 |
| 24-28 | arquivo: dono 206 · paciente de outra clínica 404 · terapeuta da clínica 206 · terapeuta de outra 404 · sem sessão 307 |
| 29-30 | apagar antes de revisado 200 + objeto sai do R2 · depois 409 `already_reviewed` |

**Teste extra não pedido — forjar `selected-clinic-id`:** terapeuta B com
`Cookie: selected-clinic-id=<clínica A>` recebeu a fila da **própria clínica B**. O cookie não
move o tenant de um THERAPIST.

## T-5 — fila de revisão e resposta do terapeuta

| # | Cenário | Resultado |
|---|---|---|
| 1 | envio novo → badge do menu aumenta | ok |
| 2 | "Waiting for you" mostra paciente, exercício, horário | **falhou** |
| 3 | o vídeo toca sem sair da tela | ok |
| 4 | enviar correção **exige prévia antes de sair** | ok |
| 5 | depois de revisado some da fila e do badge | ok |
| 6 | terapeuta de outra clínica não vê o envio | parcial — ver F3 |
| — | erros de console | zero |

**2 — FALHA** — com 1 envio pendente, `/admin/outbox` ("Waiting for you") diz "Nothing waiting".
O envio só aparece no prontuário do paciente. Quem recebe o badge não tem onde clicar para
descobrir de quem é o vídeo.

**3 — vídeo toca na tela**

    { url_antes: "/admin/patients/...", url_depois: "/admin/patients/...",
      readyState: 4, duration: 3, currentTime: 1.512381, videoWidth: 320, erro: null }
    seek para 2.4s → ok   (206 Partial Content, Accept-Ranges: bytes)

**4 — prévia é porta de verdade** — com a prévia aberta, o banco **não** tinha mudado
(`reviewedAt: null`). "Back" volta ao campo com o rascunho intacto. Só depois de "Send to patient"
o texto foi gravado — **idêntico ao previsto**, e é o que o paciente recebe.

**5 — some da fila e do badge** — `{"unreviewedSubmissions":0}`, fila vazia, menu sem número.

Screenshots: `t-5-badge-1-pendente.png`, `t-5-waiting-for-you-vazio.png`,
`t-5-painel-videos-do-paciente.png`, `t-5-previa-antes-de-enviar.png`,
`t-5-revisado-depois-do-envio.png`, `t-5-badge-zerado.png`, `t-5-outra-clinica-nao-ve.png`.

## T-6 — aviso por resumo diário

| # | Cenário | Resultado |
|---|---|---|
| 1 | nada pendente → nenhum e-mail | ok |
| 2 | com pendências → um e-mail, contagens e links | ok |
| 3 | conteúdo do e-mail → nenhum dado clínico | ok |
| 4 | rodar duas vezes no mesmo dia → um e-mail só | ok |
| 5 | duas clínicas → cada uma só o que é dela | ok |
| 6 | item já revisado não aparece no resumo seguinte | ok |
| 7 | provedor de e-mail fora do ar → cron não quebra, registra a falha | ressalva — F4 |
| — | chave de cron errada | 401 |
| — | prévia do admin = e-mail que sai | **falhou** — F5 |

**2 e 5 — um e-mail por clínica, com o que é dela** (A = 2 vídeos + 1 mensagem; B = 1 vídeo):

    {"clinicId":"...A","waiting":3,"reportSent":true}
    {"clinicId":"...B","waiting":1,"reportSent":true}
    [OUTBOUND-SINK] email -> admin@bpr.clinic: QA076 Clinic A: 3 waiting for you · 0 completed, 0 missing
    [OUTBOUND-SINK] email -> admin@bpr.clinic: QA076 Clinic B: 1 waiting for you · 0 completed, 0 missing

**3 — nenhum dado clínico** — texto visível inteiro do e-mail da clínica A:

    0 completed, 0 missing today | QA076 Clinic A | Today's adherence · Friday 25 September |
    Waiting for you | 1 | exercise videos to watch | 1 | messages from patients |
    0 completed everything | 0 missing something | admin@bpr.clinic | This is an automated message...
    links: /admin/patients, /admin/patients, mailto:admin@bpr.clinic, /dashboard

Busca por `Ana`, `AlfaQA`, `Caio`, `BetaQA`, `Knee Extension`, `joelho`, `calcanhar`, `x.test`,
`cmugq` → **0 ocorrências**. Com `waiting.total == 0` o bloco sai vazio e a expressão "Waiting for
you" não aparece no HTML.

**4 — duas rodadas, um e-mail** — segunda chamada: todas as clínicas com `reportSent:false`,
e-mails compostos: nenhum.

**6 — revisado sai do resumo** — revisado 1 dos 2 vídeos de A, nova rodada: `waiting` 3 → 2.

## Falhas encontradas

### F1 — `.exe` renomeado passa como vídeo (T-1)

`lib/exercise-submission.ts:50-57` — `refuseSubmission` lê `file.type`, que é o `Content-Type`
escrito pelo cliente no multipart. Nenhum byte do arquivo é inspecionado.

    curl -i -b <jar-do-paciente> -X POST http://localhost:4076/api/patient/exercise-submissions \
      -F "file=@qualquer.exe;filename=inocente.mp4;type=video/mp4" \
      -F "exercisePrescriptionId=<prescrição do próprio paciente>"
    # -> 200 OK, gravado no R2 como .mp4 e servido com Content-Type: video/mp4

Um *magic number* (`ftyp` para MP4/MOV, `\xFF\xD8\xFF` JPEG, `\x89PNG`) resolve — os bytes já
estão no `Buffer` da linha 111.

### F2 — o envio não entra em "Waiting for you" (T-5)

`lib/admin-sections.ts:205` — "Waiting for you" no admin é `/admin/outbox`, a fila da automação
(atividade 072). Ela não conhece `ExerciseSubmission`; o único consumidor novo é o painel dentro
do prontuário. O badge avisa que há algo e não existe tela que diga **de quem**.

### F3 — `pending-count` entrega contagens de outra clínica (T-5, vazamento entre tenants)

`app/api/admin/pending-count/route.ts:25-31` e `:60-64` — `clinicId` vem da query e vira
`effectiveClinicId` sem checar que o chamador pertence àquele tenant.

    # terapeuta da clínica B
    curl -b <jar-tb> "http://localhost:4076/api/admin/pending-count?clinicId=<id-da-clínica-A>"
    {"pendingPatients":1,"unreadMessages":1,"answeredQuestions":0,"unassignedMeasurements":0,"unreviewedSubmissions":1}
    # referência (própria clínica B):
    {"pendingPatients":0,"unreadMessages":0,"answeredQuestions":0,"unassignedMeasurements":0,"unreviewedSubmissions":1}

São só contagens (sem nomes), mas dizem quantos vídeos e quantas mensagens outra clínica tem
parados. O bug é **pré-existente** — `pendingPatients`, `unreadMessages` e
`unassignedMeasurements` já andavam nele; a T-5 pendurou `unreviewedSubmissions` na mesma rota sem
a guarda. Mesma família de `a04338cd fix: any clinic's staff could open any patient's file (076)`.

### F4 — envio que falhou fica registrado como enviado (T-6)

`app/api/cron/daily-report/route.ts:62-73` — `sendEmail` devolve `{success:false}` quando o
provedor falha, e o retorno é ignorado; a linha seguinte grava `REPORT_ACTION` com "…e-mailed for
X" e marca `reportSent = true`. Como o dedupe lê exatamente essa linha, **o dia perdido nunca é
retentado**.

    http=200, rota respondeu com 5 clinicas (nao quebrou)
    [EMAIL] Resend send failed: Error: [EMAIL] RESEND_API_KEY not configured...
    {"clinicId":"...A","waiting":2,"reportSent":true}
    AuditLog: "Daily adherence report e-mailed for QA076 Clinic A"

### F5 — a prévia do admin já não é o e-mail que sai (T-6)

`app/api/admin/adherence/preview-email/route.ts:30` chama `buildDailyAdherenceEmail(...)` sem o 6º
argumento `waitingBlock`, que o cron passa. O comentário em `lib/daily-adherence-email.ts:27-29`
promete o contrário.

    previa do admin menciona 'Waiting for you'? 0
    e-mail real do cron menciona 'Waiting for you'? 1

O assunto também diverge: o cron manda `"<clínica>: N waiting for you · …"` e a prévia não mostra
assunto nenhum.

### F6 — plural não tratado no bloco do resumo (menor, T-6)

`lib/clinic-waiting.ts:79-81` — saída real: `1 exercise videos to watch`, `1 messages from
patients`. Vai para a caixa da clínica todo dia.

## O que não foi medido e por quê

- **T-3 e T-4** — exigem iPhone (gravador, limite de 60s, permissão de câmera, anexo na conversa).
  Não aprovados, não testados.
- **Falha do banco depois do upload pela rota HTTP** — não existe entrada válida que passe pela
  rota e quebre o `create` (`durationSeconds=3.7` o Prisma trunca para 3, 200 OK). A falha foi
  provocada na função real compilada.
- **Rotas sob token bearer do app** — só sessão web com cookie; cai na T-3.
- **Foto HEIC** — só JPEG e o `.exe` foram gerados.
- **Corrida de dois envios no mesmo milissegundo.**
- **Envio de e-mail de verdade** — proibido pelo escopo; tudo com `OUTBOUND_MODE=sink`.
- **Provedor respondendo erro** (em vez de chave ausente) — não é controlável localmente.

## Fora do escopo, mas vale avisar

1. **Cookie de `localhost` é compartilhado entre portas.** Um QA de UI que não faça signout
   explícito pode medir logado como usuário de outro worktree.
2. O cron `daily-report` percorre **todas** as clínicas ativas: no banco local são 17, das quais 3
   tinham adesão do dia e receberam e-mail (interceptado). As 5 linhas de auditoria criadas pelas
   rodadas foram apagadas.
