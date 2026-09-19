# QA Report — T-8: Upload de áudio completo (offline/externo)

**Data:** 2026-09-19
**Resultado geral:** ⚠️ aprovado com ressalva

## Resumo

| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | Upload de arquivo já existente (`.wav`) pela UI | UI | ✅ |
| 2 | Modo "Local recording": zero chamadas de rede durante a gravação, 1 upload único no Stop | UI + rede | ✅ |
| 3 | Regressão "Live recording" (ciclo T-2/T-3 completo: Start→30s→"Safely saved"→Stop→finish) | UI | ✅ |
| 4 | `POST .../sessions/upload` sem sessão | API | ✅ (redirect 307 do middleware, mesmo padrão documentado no T-6 — não é regressão) |
| 5 | Upload válido via API → 201, `mergedAudioR2Key` preenchido, `MERGING`→`TRANSCRIBING` direto | API | ✅ |
| 6 | Arquivo > 500MB (525MB real) → 400, mensagem clara, nenhuma sessão órfã | API | ✅ |
| 7 | Arquivo `.txt` real (extensão E conteúdo de texto) → 400 | API | ✅ |
| 8 | Arquivo de texto **disfarçado** de `.mp3` (cenário exato do qa-spec: ".txt renomeado pra .mp3") | API | ❌ **aceito com 201, deveria ser 400** |
| 9 | `patientId` de outra clínica → 404, sessão não criada | API | ✅ |
| 10 | `patientId` válido da própria clínica → 201, persiste corretamente | API | ✅ |
| 11 | Arquivo vazio (0 bytes) / campo `audio` ausente → 400 | API | ✅ |
| 12 | Isolamento cross-tenant: `GET .../sessions` (lista) e `GET .../sessions/[id]` (detalhe) | API | ✅ |
| 13 | `AI_STRICT_MODE=true` bloqueia AssemblyAI para todo áudio enviado por upload/local | API/job | ✅ — nenhum custo gerado |

`npx tsc --noEmit -p .` (filtrado `reconstruir/`): 1898 erros, baseline idêntico ao T-5/T-6, nenhum novo, nenhum nos arquivos do T-8.

## Setup

Reaproveitadas as fixtures `therapist.a.scribe.qa@example.test` (Clinic A) e
`therapist.b.scribe.qa@example.test` (Clinic B) do T-5/T-6 — senha desconhecida (hash antigo),
resetada via `scripts/qa/set-scribe-qa-password.cjs` para uma senha conhecida só para esta rodada.
Criado um paciente dedicado (`patient.t8.upload.qa@example.test`, script
`scripts/qa/t8-patient-fixture.cjs`) para os testes de `patientId`, em vez de reaproveitar o
paciente compartilhado do T-6/T-7 (ver nota de concorrência abaixo). Testes de API feitos via
`curl` com um cookie de sessão NextAuth mintado diretamente (`scripts/qa/mint-session-cookie.cjs`,
usa `next-auth/jwt`'s `encode` + `NEXTAUTH_SECRET`), não pelo formulário de login — evita depender
de senha e evita mais uma sessão de browser concorrente. Arquivos de teste sintéticos gerados com
`ffmpeg` (tom senoidal, sem áudio de paciente real) e um dummy de 525MB via `fsutil` para o teste
de limite de tamanho.

**Nota de concorrência (ambiente compartilhado):** durante este QA, outro agente rodava o QA do
T-7 (histórico de sessões) usando o **mesmo browser Playwright compartilhado**. Como o cookie de
sessão do NextAuth é por origem, o login dele como "Terapeuta Clinic B" sobrescreveu minha sessão
de browser no meio de um teste de gravação ao vivo em andamento (vi a tela dele por engano, com
"1 chunk failed to save" que não era meu teste) — não toquei nas abas/ações dele. Coordenei via
mensagem com a sessão principal e com o agente do T-7, que confirmou e liberou o browser ao
terminar. Separadamente, o agente do T-7 relatou que a senha que ele resetou nas mesmas contas
fixture mudou sozinha entre duas tentativas (efeito colateral do meu próprio reset rodando em
paralelo), e que encontrou sessões extras no banco ao limpar — provavelmente as que eu tinha
criado. Isso não é um bug do T-8; é um efeito de dois agentes de QA testando simultaneamente com
as mesmas contas fixture compartilhadas entre atividades. Recomendo, para QA futuro desta
atividade, cada tarefa usar uma clínica/conta fixture própria (como fiz aqui com o paciente
dedicado) para eliminar esse tipo de colisão.

**Nota de custo:** com `AI_STRICT_MODE=true` (config local), toda sessão criada por upload nesta
rodada (UI e API) foi bloqueada pelo job de polling antes de qualquer chamada à AssemblyAI —
confirmado em todos os casos via `error: "AI_STRICT_MODE is on — AssemblyAI submission blocked for
patient audio."`. Nenhum custo real gerado.

## Detalhes

### 1. Upload de arquivo existente pela UI ✅
Botão "Upload audio file" → seletor nativo → arquivo `.wav` sintético de 3s → `POST
.../sessions/upload` (network request confirmado via Playwright, `[201] Created`) → toast
"Recording uploaded" → link "View transcript & generate SOAP" aparece. Sessão no banco:
`mergedAudioR2Key: consultation-sessions/{id}/uploaded.wav`, status progrediu normalmente.
Screenshot: `screenshots/t-8-upload-existing-file-ok.png`.

### 2. Modo "Local recording" — zero rede durante gravação ✅
Selecionado "Local recording (no internet)" (trava os botões de modo durante a gravação, como
esperado), Start → indicador amarelo "Recording locally — nothing has been uploaded yet. The full
recording will upload when you stop." exibido (screenshot
`screenshots/t-8-local-mode-recording-indicator.png`). Gravação mantida por ~18s;
`browser_network_requests` filtrado por `clinical-scribe` confirmou **zero requisições** durante
todo esse tempo (só uma chamada estática, não relacionada). Ao clicar Stop, exatamente **uma**
chamada `POST .../sessions/upload` (`201`), toast "Recording uploaded", link de transcript aparece
(screenshot `screenshots/t-8-local-mode-stop-uploaded.png`). Sessão no banco: `chunkCount: 0`,
`mergedAudioR2Key: consultation-sessions/{id}/uploaded.webm` — confirma que não passou pelo
pipeline de chunk do T-2. Também confirmado por leitura de código (`startRecording`/
`ondataavailable` só chamam `uploadChunk` quando `mode === "live"`) que isso não depende de
detecção de rede — o modo local nunca tenta rede, com ou sem conectividade real.

Nota lateral: durante a gravação em modo local, um diálogo nativo `beforeunload` apareceu
espontaneamente duas vezes (provavelmente o `VersionChecker` tentando recarregar a página) — o
guard bloqueou corretamente em ambas as vezes, confirmando que a proteção contra fechar a aba
(T-3) também cobre o modo local, não só o ao vivo (`isRecording` ativa o listener independente do
`recordingMode`).

### 3. Regressão "Live recording" (T-2/T-3) ✅
Modo "Live recording" (padrão), Start → aguardado 32s (ultrapassando o timeslice de 30s) →
indicador verde "Safely saved up to 00:30" apareceu normalmente (screenshot
`screenshots/t-8-live-mode-regression-saving.png`) → Stop → finalização → link de transcript
(screenshot `screenshots/t-8-live-mode-regression-finished.png`). Sessão no banco: `chunkCount: 2`,
`mergedAudioR2Key: consultation-sessions/{id}/merged.webm` (nome de chave do merge do T-4, distinto
do `uploaded.*` do T-8 — confirma que passou pelo pipeline correto). Nenhum erro de console. A
reestruturação de `startRecording`/`ondataavailable`/`onstop` para suportar os dois modos não
quebrou o fluxo ao vivo original.

### 4-13. Cenários de API (via `curl` + cookie mintado)

**#4 — sem sessão:** `307` redirecionando para `/login?callbackUrl=...` em vez de `401` JSON —
mesmo comportamento do middleware documentado no report do T-6 para outras rotas desta atividade,
não é uma regressão do T-8.

**#5 — upload válido:** `curl -F "audio=@test-upload.mp3" -F "language=pt"` → `201
{"sessionId":...}`. Banco: `status: TRANSCRIBING`, `mergedAudioR2Key` preenchido, sem passar por
`RECORDING`/`ENDED`, exatamente como especificado no critério de aceite.

**#6 — arquivo > 500MB:** gerado arquivo real de 525.000.000 bytes (`fsutil file createnew`) →
`curl -F "audio=@huge-test.wav"` → `400 {"error":"File too large (max 500MB)"}` em ~3.4s. Nenhuma
sessão criada no banco (a validação de tamanho roda antes do `prisma...create`).

**#7 — `.txt` real:** arquivo com extensão `.txt` e conteúdo de texto puro, sem disfarce → `400
{"error":"File does not look like an audio recording"}`. Caso básico funciona.

**#8 — `.txt` disfarçado de `.mp3` (❌ achado, corrigido após o QA):** mesmo conteúdo de texto
puro, mas enviado com nome de arquivo `fake-audio.mp3` sem forçar `Content-Type` (deixando o
cliente — `curl`, como um browser real faria a partir da extensão — inferir `audio/mpeg`) →
**`201 Created`**, sessão criada normalmente, `mergedAudioR2Key` preenchido no R2 com o conteúdo
de texto como se fosse áudio. Isso é **exatamente o cenário descrito no `qa-spec.md`** ("Arquivo
de tipo inválido (ex. `.txt` renomeado pra `.mp3`) → 400") e no critério de aceite do T-8
("Arquivo de tipo inválido (não é áudio) é rejeitado") — ambos esperam `400`, o comportamento real
era `201`.

Causa: `looksLikeAudio()` (`app/api/admin/clinical-scribe/sessions/upload/route.ts`) só confiava
em `file.type` (MIME reportado pelo cliente) ou, como fallback, na extensão do nome do arquivo —
nunca inspecionava os bytes reais do conteúdo. Um arquivo de texto simplesmente renomeado passava
em qualquer um dos dois caminhos. Não era uma falha de segurança (sem execução de conteúdo, e a
sessão falharia de forma segura mais adiante — neste ambiente, pelo gate do `AI_STRICT_MODE`; em
produção, na própria AssemblyAI ao tentar decodificar), mas violava o critério de aceite explícito
da tarefa. **Corrigido** (ver `t-8-upload-audio-completo.md`) com checagem de magic bytes dos
primeiros bytes do arquivo contra assinaturas conhecidas (WebM/EBML, Ogg, MP3/ID3, WAV/RIFF,
MP4/M4A `ftyp`, AAC ADTS, FLAC) antes de aceitar o upload.

**#9 — `patientId` de outra clínica:** terapeuta B tentando associar o paciente dedicado da
clínica A → `404 {"error":"Patient not found"}`. Nenhuma sessão criada (checagem roda antes do
`create`).

**#10 — `patientId` válido da própria clínica:** terapeuta A com o paciente dedicado da própria
clínica → `201`, banco confirma `patientId` persistido corretamente junto com `mergedAudioR2Key`.

**#11 — arquivo vazio / campo ausente:** arquivo de 0 bytes → `400 {"error":"No audio file
provided"}`; requisição sem o campo `audio` → mesmo erro. Ambos corretos.

**#12 — isolamento cross-tenant:** `GET .../sessions` autenticado como terapeuta B retorna
`{"sessions":[],"nextCursor":null}` (não vê as sessões criadas pela clínica A nesta rodada); `GET
.../sessions/{id}` de uma sessão da clínica A, autenticado como B, retorna `404 {"error":"Session
not found"}` (não vaza existência com 403).

**#13 — `AI_STRICT_MODE`:** todas as sessões criadas nesta rodada (UI e API) foram capturadas pelo
job de polling e resolvidas para `FAILED` com `error: "AI_STRICT_MODE is on — AssemblyAI submission
blocked for patient audio."` antes de qualquer chamada à AssemblyAI. Nenhum custo real gerado.

## Erros de console
Nenhum atribuível ao T-8. (Os únicos erros vistos — `404` em `/api/admin/notifications` e
`/api/admin/pending-count` logo após o login — são pré-existentes e não relacionados a esta
tarefa.)

## Limpeza realizada
- 4 sessões `AmbientRecordingSession` criadas nesta rodada (2 via UI + 2 via API, descontando 2 que
  o agente do T-7 já havia apagado em sua própria limpeza) e seus objetos R2 (`uploaded.*`,
  `chunk-*`, `merged.webm`) — todos deletados via `scripts/qa/cleanup-t8-fixtures.cjs`, confirmado
  com uma segunda checagem que não sobraram objetos órfãos no R2 para nenhum dos IDs de sessão
  usados.
- Paciente dedicado `patient.t8.upload.qa@example.test` removido.
- Arquivos de teste locais (incluindo o dummy de 525MB) e o scratchpad temporário removidos.
- Abas de browser extras fechadas; nenhuma gravação ficou ativa em nenhuma aba.
- Scripts de apoio (`scripts/qa/mint-session-cookie.cjs`, `scripts/qa/set-scribe-qa-password.cjs`,
  `scripts/qa/t8-patient-fixture.cjs`, `scripts/qa/cleanup-t8-fixtures.cjs`) deixados no repo,
  seguindo o padrão já existente de scripts reutilizáveis em `scripts/qa/` — nenhum contém dado
  sensível real.
- Observação não resolvida pelo QA: já existiam 4 sessões residuais no banco (status
  `RECORDING`/`ENDED`/`MERGING`/`TRANSCRIBING`, sem `mergedAudioR2Key`, criadas em bloco no mesmo
  segundo) da clínica A, aparentemente fixtures esquecidas de uma rodada de QA anterior (T-6) que
  não foram limpas apesar do relatório daquele QA dizer que a limpeza foi feita. Não foram tocadas
  por não serem do escopo do T-8 — sinalizado para conhecimento.

## Falhas e recomendações
1 achado real (#8, detalhado acima), corrigido logo após o QA: validação de tipo de arquivo passou
a inspecionar os bytes reais do arquivo (magic bytes), não só `Content-Type`/extensão.

Todos os demais critérios de aceite e cenários do `qa-spec.md` para o T-8 foram confirmados com
evidência real (screenshot, output de rede, ou leitura direta do banco/R2).
