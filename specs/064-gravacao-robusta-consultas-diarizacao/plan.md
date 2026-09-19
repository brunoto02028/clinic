# Atividade 064 — Gravação robusta de consultas ao vivo com distinção de voz

## Objetivo

O Bruno faz consultas presenciais (inclusive em domicílio) que podem durar 40-90 minutos e
precisa gravá-las com segurança real (sem risco de perder tudo se algo travar no meio ou faltar
internet no local), depois ter a transcrição já separando as falas dele das falas do paciente
("Terapeuta:" / "Paciente:"), pra alimentar a geração de nota SOAP corretamente.

Duas formas de entrada de áudio, ambas alimentando o mesmo pipeline de diarização + transcrição +
SOAP (ver Decisão 6):
1. **Gravação ao vivo** — upload incremental durante a consulta, quando há internet estável (T-2/T-3).
2. **Áudio já gravado** — gravado localmente no aparelho sem internet (consulta em domicílio sem
   sinal) e enviado inteiro depois quando a conexão voltar, OU um arquivo de áudio gravado por
   outro meio (ex. app de gravação do celular, usado como backup) e enviado manualmente pro
   sistema (T-8).

Já existe um começo disso — o "Ambient Scribe" (`app/admin/clinical-ai/page.tsx`) — mas com duas
lacunas reais: (1) a gravação inteira fica só na memória da aba até clicar "Stop", sem nenhuma
persistência progressiva; (2) a transcrição (Groq Whisper) não distingue vozes. Esta atividade
resolve as duas.

## Contexto técnico já levantado

- **Ambient Scribe hoje**: `MediaRecorder` acumula chunks num `chunksRef` (React ref, só memória),
  vira um `Blob` só no `stop()`, envia inteiro pra `app/api/admin/clinical-scribe/transcribe/route.ts`
  (Groq Whisper, fallback Gemini se `AI_STRICT_MODE` não estiver ligado). Sem diarização. Sem
  persistência incremental — aba travar/fechar no meio = perde a consulta inteira.
- **`generate-soap/route.ts`** já existe e recebe `transcript` como **string plana**, interpolada
  direto no prompt — um texto formatado `"Terapeuta: ...\nPaciente: ..."` funciona **sem nenhuma
  mudança** nessa rota.
- **`ConsultationRecording`** (model existente, `prisma/schema.prisma:5978`) é outra coisa: nota de
  áudio curta, **iniciada pelo paciente** antes da consulta, guardada como **base64 direto na
  coluna** `audioUrl` (comentário no código: "in production, use S3/Cloudinary" — nunca foi
  ajustado). Não serve pra isso — caso de uso, iniciador e mecanismo de storage diferentes. Esta
  atividade usa um **model novo**.
- **`lib/r2.ts`**: `uploadToR2(key, buffer, contentType)` / `uploadStreamToR2(...)` — upload
  single-shot, sem multipart/resumable. `listR2(prefix)` existe e é suficiente pra listar os
  pedaços de uma sessão sem precisar de tabela nova só pra isso.
- **`AI_STRICT_MODE`**: política de compliance real do projeto (GDPR — `lib/claude.ts:36-39`,
  comentários "no patient audio to Minimax" em `transcribe/route.ts` e
  `consultation-recording/route.ts`). Adicionar a AssemblyAI como provedor novo tocando áudio de
  paciente é decisão de compliance, não só técnica — ver Suposição 1.
- **Padrão de job em background já existente**: `lib/background-jobs.ts` (`setInterval` via
  `instrumentation.ts`), ex. `generatePendingEvidenceReports` processa uma fila a cada 2min com
  `attempts` pra não travar em loop — reaproveitado aqui pro polling da AssemblyAI.
- **AssemblyAI** (provedor já aprovado pelo Bruno, ver Decisões): upload em
  `POST https://api.assemblyai.com/v2/upload` (header `authorization: $ASSEMBLYAI_API_KEY`, sem
  "Bearer"); diarização via `"speaker_labels": true` em `POST /v2/transcript`; aceita `audio_url`
  direto (evita subir o áudio duas vezes se o R2 já expõe uma URL); assíncrono, poll em
  `GET /v2/transcript/{id}` até `status: completed`; até 10h/5GB por arquivo; português (incluindo
  variante brasileira) suportado tanto pra transcrição quanto pra diarização junto.

## Decisões de design

1. **Upload incremental durante a gravação, não só no fim.** `MediaRecorder` com `timeslice` (a
   cada 30-60s) — cada chunk é enviado pro servidor assim que é gerado, e salvo como um objeto
   **separado** no R2 (`consultation-sessions/{sessionId}/chunk-0001.webm`, etc.). Se a aba travar
   ou fechar no meio, o que já foi gravado está seguro — perde no máximo o último pedaço (30-60s).
2. **Finalização assíncrona.** Ao clicar "Stop", o cliente avisa o servidor (`status: ENDED`). Um
   job em background (padrão já existente em `lib/background-jobs.ts`) concatena os chunks em
   ordem (chunks webm/opus de uma mesma sessão contínua são binariamente concatenáveis — técnica
   conhecida), sobe o arquivo final único pro R2, envia a URL pra AssemblyAI com
   `speaker_labels: true`, e faz polling até o transcript ficar pronto — aí formata como texto
   diarizado legível e salva.
3. **Model novo, não reaproveita `ConsultationRecording`.** Nome proposto: `AmbientRecordingSession`
   (ver Suposição 3). Sem tabela separada pra chunks — `listR2(prefix)` com convenção de nome já
   resolve.
4. **SOAP reaproveita `generate-soap/route.ts` sem nenhuma mudança** — só formata o transcript
   diarizado como texto plano antes de mandar.
5. **Histórico de sessões** — tela nova (não reaproveita nada da atividade 063, é feature
   diferente) listando gravações passadas do Bruno, com status e link pro transcript/SOAP.
6. **Pipeline único a partir do áudio completo.** As duas formas de entrada (gravação ao vivo
   finalizada, ver Decisão 2; ou áudio já pronto — gravado offline ou de outra fonte, ver T-8)
   convergem no mesmo ponto: uma sessão com `mergedAudioR2Key` preenchido e `status: MERGING` ou
   direto `TRANSCRIBING`. T-5, T-6 e T-7 não sabem nem precisam saber de onde veio o áudio — o
   mesmo job de polling, a mesma tela de transcript/SOAP, o mesmo histórico servem pras duas.
7. **Áudio no R2 nunca fica público.** `r2PublicUrl()` (já existente em `lib/r2.ts`) gera um link
   público permanente — ótimo pra vídeo de exercício, errado pra áudio de consulta (é o mesmo
   motivo que fez `PatientDocument` guardar o arquivo como base64 no Postgres em vez de um link
   público: "arquivos sob `public/` são servidos sem autenticação"). Aqui, `mergedAudioR2Key`
   guarda só a CHAVE do objeto, nunca a URL pública. Playback no admin (T-6) passa por uma rota
   autenticada que busca o objeto do R2 server-side (mesmo padrão de `/api/files/[id]` já usado
   pros documentos do paciente). Envio pra AssemblyAI (T-5) usa o endpoint de upload PRÓPRIO deles
   (`POST /v2/upload`, servidor-a-servidor, nunca expõe nosso R2 publicamente) em vez de passar
   `audio_url` apontando pro nosso bucket — um passo a mais, mas sem abrir uma sensível gravação de
   consulta pra qualquer um com o link.
8. **Modo offline (gravação local sem internet).** O `AmbientScribe` grava com `MediaRecorder`
   normalmente, mas quando o modo escolhido é "local" (ou quando o upload de chunk em tempo real
   falha repetidamente por falta de rede — ver Suposição 7), os chunks são mantidos SÓ no
   navegador (em memória, como o Ambient Scribe faz hoje) em vez de tentar subir cada um. Ao
   clicar "Stop" (ou ao recuperar conexão), o áudio completo já montado no cliente é enviado de
   uma vez pela rota do T-8 — mesmo resultado final de uma gravação ao vivo bem-sucedida, só que
   sem a proteção incremental durante a gravação em si (aceito, já que não havia internet pra
   proteger de qualquer forma).

## Suposições (peço validação)

1. **`AI_STRICT_MODE` deve gatear a AssemblyAI também?** Ela tocaria áudio real de paciente, então
   recomendo aplicar a mesma cautela já usada pra Groq/Gemini — se `AI_STRICT_MODE` estiver ligado
   e a AssemblyAI não tiver DPA/postura de GDPR confirmada por você, a transcrição falharia
   explicitamente em vez de silenciosamente usar um provedor não aprovado. **Isso é uma decisão
   sua, não técnica** — confirme se aceita esse gate, ou se quer que eu pesquise a postura de GDPR
   da AssemblyAI antes de decidir.
2. **Sem retomada automática de gravação após reload/crash na v1.** O áudio até o momento do
   travamento fica salvo no R2 (seguro), mas a v1 não tenta reconectar o `MediaRecorder`
   automaticamente — você precisaria iniciar uma sessão nova pro resto, com duas transcrições pra
   juntar manualmente se precisar. Retomada automática é escopo bem maior (exige persistir estado
   do gravador entre reloads, não é trivial no browser). Aceitável pra v1, ou é bloqueante?
3. **Nome do model**: `AmbientRecordingSession` é só sugestão — avise se prefere outro.
4. **Paciente pode não estar selecionado ao iniciar a gravação** (consulta em domicílio às vezes
   começa sem tempo de mexer no sistema primeiro) — associar o paciente é um passo separado, feito
   antes de gerar o SOAP. Confirma essa ordem, ou prefere obrigar a seleção antes de começar a
   gravar?
5. **Sem limite/alerta de custo na v1** — o custo real é baixo (~$0,15-0,27 por hora de consulta
   com a AssemblyAI). Avise se quiser um teto ou aviso de uso mesmo assim.
6. **A AssemblyAI não sabe quem é o terapeuta e quem é o paciente** — ela só identifica "Speaker A",
   "Speaker B", sem saber qual é qual. Duas opções: (a) heurística automática (assumir que quem
   fala primeiro/mais é o terapeuta — pouco confiável), ou (b) mostrar "Speaker A"/"Speaker B" no
   transcript bruto e você troca manualmente pros rótulos certos antes de gerar o SOAP (mais
   trabalho seu, mas nunca erra). Recomendo (b) pela T-6. Qual prefere?
7. **Modo local/offline: escolha manual antes de começar, ou detecção automática de falta de
   rede?** Recomendo escolha manual (um toggle simples "Gravação ao vivo" vs. "Gravação local" na
   tela, ver T-8) — detectar "sem internet" de forma confiável no meio de uma gravação é mais
   frágil (rede instante-a-instante, falso positivo de uma rede lenta vs. realmente offline) do
   que só deixar você decidir de antemão sabendo que vai numa casa sem wifi. Concorda, ou prefere
   que o sistema tente detectar sozinho e alternar automaticamente?
8. **Tamanho máximo pra upload de áudio já pronto** (T-8) — uma consulta de 90min em formato
   comprimido (m4a/opus, como celulares gravam por padrão) fica bem abaixo de 100MB normalmente,
   mas vou colocar um teto de segurança na validação (proponho 500MB, bem acima do esperado, só
   pra evitar upload de arquivo errado/corrompido gigante). Ok, ou quer outro limite?

## Tarefas

| Tarefa | Nome | Status |
|---|---|---|
| T-1 | Schema (`AmbientRecordingSession` + enum de status) | concluído |
| T-2 | Upload incremental de chunk (rota + MediaRecorder com timeslice na UI) | concluído |
| T-3 | Indicador "salvo até X:XX" + aviso beforeunload durante gravação | concluído |
| T-4 | Finalização — rota "finish" + job de merge dos chunks no R2 | concluído |
| T-5 | Integração AssemblyAI (submissão + job de polling em background) | concluído |
| T-6 | Exibição do transcript diarizado + geração de SOAP a partir dele | concluído |
| T-7 | Histórico de sessões de gravação | concluído |
| T-8 | Upload de áudio completo (gravação local/offline ou arquivo externo) | concluído |
