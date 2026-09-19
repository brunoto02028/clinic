# T-8: Upload de áudio completo (gravação local/offline ou arquivo externo)

**Status:** concluído
**Depende de:** T-1

## Objetivo
Duas necessidades reais que convergem na mesma solução técnica:
1. Consulta em domicílio sem internet — grava local no navegador, sem depender de upload
   contínuo, e envia o áudio inteiro quando a conexão voltar.
2. Um áudio gravado por outro meio (ex. app de gravação do celular, usado como backup ou porque
   preferiu gravar assim) — sobe manualmente pro sistema pra passar pelo mesmo pipeline de
   diarização/transcrição/SOAP.

Nos dois casos: o cliente já tem o arquivo de áudio completo em mãos (seja porque gravou tudo
localmente, seja porque é um arquivo escolhido do dispositivo) — não precisa do fluxo incremental
de chunks do T-2, só precisa enviar de uma vez.

## Contexto
Ver plan.md, Decisões 6 e 7, Suposições 7 e 8. Esta tarefa entrega uma rota nova, ortogonal ao
fluxo T-2→T-4 (chunk incremental → merge) — ambas convergem no mesmo estado (`mergedAudioR2Key`
preenchido), de onde T-5 (AssemblyAI) assume normalmente.

## Passos
1. Rota nova `POST /api/admin/clinical-scribe/sessions/upload/route.ts` — recebe um arquivo de
   áudio completo (`multipart/form-data`), `patientId` opcional, `language`. Valida tipo/tamanho
   (teto de segurança — ver Suposição 8 do plan.md, confirmar valor final aqui antes de
   implementar). Cria a `AmbientRecordingSession` já com `status: MERGING` (pula `RECORDING`),
   sobe o arquivo direto pro R2 como `mergedAudioR2Key`, sem necessidade de concatenar nada (já é
   um arquivo só). Segue pro mesmo caminho do T-4/T-5 a partir daí (`status: TRANSCRIBING`,
   entra na fila de polling).
2. No `AmbientScribe`, um seletor de modo ao iniciar: "Gravação ao vivo" (fluxo T-2/T-3 já
   existente) vs. "Gravação local" (grava com `MediaRecorder` só em memória, como o comportamento
   ORIGINAL do Ambient Scribe antes desta atividade — sem chunk incremental — e ao "Stop", ao invés
   de mandar pro `/transcribe` antigo, manda o Blob completo pra rota deste T-8).
3. Também no `AmbientScribe` (ou numa aba/seção dedicada), um botão "Enviar áudio gravado" com
   input de arquivo — pra subir um arquivo já existente (gravado no celular, por exemplo), mesma
   rota do passo 1.
4. Indicador de "gravando localmente — nada foi enviado ainda, será enviado ao finalizar" durante
   o modo local, pra não confundir com o indicador de segurança em tempo real do T-3 (que só se
   aplica ao modo ao vivo).

## Arquivos afetados
- `app/api/admin/clinical-scribe/sessions/upload/route.ts` (novo)
- `app/admin/clinical-ai/page.tsx`

## Critérios de aceite
- [x] Escolher "Gravação local", gravar, parar, e o áudio é enviado de uma vez ao finalizar —
      sessão segue o mesmo caminho até `TRANSCRIBED` que uma gravação ao vivo.
- [x] Enviar um arquivo de áudio já existente (ex. gravado num celular, formato comum como
      m4a/mp3/opus) funciona e processa normalmente.
- [x] Arquivo maior que o teto definido é rejeitado com mensagem clara, não trava a UI.
- [x] Arquivo de tipo inválido (não é áudio) é rejeitado.
- [x] Simular gravação local sem internet do início ao fim (offline no devtools durante toda a
      gravação) → nenhuma chamada de rede até o envio final ao "Stop" (confirmar que o modo local
      realmente não depende de conectividade durante a gravação).
- [x] Isolamento cross-tenant: staff só consegue criar/ver sessões da própria clínica.

## Implementação

`POST /api/admin/clinical-scribe/sessions/upload/route.ts` (novo) — mesmo padrão fail-closed
getActor/isStaff/clinicId das outras rotas; valida arquivo presente, tamanho ≤ 500MB (Suposição 8),
tipo (`audio/*` ou extensão numa lista permitida, pra cobrir o caso de celulares que mandam
`Content-Type` vazio/genérico pra m4a); cria a sessão já em `MERGING` → sobe o arquivo pro R2 como
`mergedAudioR2Key` → `TRANSCRIBING`, sem concatenar nada (já é um arquivo só). A partir daí é
indistinguível de uma sessão que passou pelo merge do T-4 — o job de polling do T-5 pega igual
(plan.md Decisão 6, nenhuma mudança em `lib/background-jobs.ts` foi necessária).

`AmbientScribe` (`app/admin/clinical-ai/page.tsx`) ganhou: (1) um seletor "Live recording" vs.
"Local recording (no internet)", travado durante a gravação — em modo local, `startRecording` não
cria sessão nem faz nenhuma chamada de rede até o Stop, `ondataavailable` só acumula em memória
(mesmo comportamento que o Ambient Scribe tinha originalmente, antes desta atividade), e `onstop`
manda o Blob inteiro pra rota de upload acima em vez de esperar os chunks e chamar `/finish`; (2)
indicador "Recording locally — nothing has been uploaded yet" substituindo o indicador de
"salvo até X:XX" do T-3 nesse modo, pra nunca ser confundido com a garantia do modo ao vivo; (3)
botão independente "Upload audio file" (input de arquivo oculto) que manda qualquer arquivo de
áudio existente direto pra mesma rota, sem precisar gravar nada.

QA (agente qa-tester): 12/13 cenários aprovados — modo local confirmado com ZERO chamadas de rede
durante a gravação (via inspeção de rede real) e upload único no Stop, upload de arquivo existente
funcionando pela UI, regressão do "Live recording" confirmada intacta, teto de 500MB testado com
arquivo real de 525MB, isolamento cross-tenant e `patientId` de outra clínica corretos,
`AI_STRICT_MODE` bloqueando qualquer chamada real à AssemblyAI (sem custo). `qa/report-t-8.md`.

**Achado do QA, corrigido**: a validação de tipo de arquivo (`looksLikeAudio`, baseada só em
`Content-Type`/extensão) aceitava um arquivo de texto puro renomeado com extensão `.mp3` — exatamente
o cenário "`.txt` renomeado pra `.mp3`" do `qa-spec.md`, que deveria ser rejeitado com 400 e estava
sendo aceito com 201. Corrigido: `hasAudioMagicBytes()` agora inspeciona os bytes reais do arquivo
(assinaturas de WebM/EBML, Ogg, WAV/RIFF, MP3 com ID3 ou frame-sync, FLAC, MP4/M4A `ftyp`) antes de
aceitar — verificado com um teste direto (texto disfarçado → rejeitado; cabeçalhos reais de cada
formato suportado → aceitos).

Code review: nenhum vazamento de estado entre gravações em modos diferentes, nenhum gap de
autorização comparado ao padrão da atividade. 3 achados reais, todos corrigidos; 1 documentado como
limitação aceita:
1. A checagem de 500MB só rodava depois de `req.formData()` já ter bufferizado o corpo inteiro em
   memória — não protegia de verdade contra um corpo muito maior que o teto. Corrigido: checagem
   antecipada por `Content-Length` (com folga de 10% pro overhead do multipart) antes de qualquer
   parse, rejeitando com 413 cedo.
2. O botão independente "Upload audio file" nunca ativava `finalizing`, então nenhum dos guards que
   protegem a mesma chamada (`uploadCompleteAudio`) quando disparada pelo Stop do modo local
   (aviso de beforeunload, bloqueio de navegação, guard de troca de aba) protegia esse upload — um
   arquivo grande podia ser perdido silenciosamente fechando a aba no meio. Corrigido: `uploadingFile`
   agora participa dos três guards (beforeunload, clique em link, `onRecordingStateChange`), com
   mensagem própria ("Upload in progress").
3. O botão "Start Recording" não considerava `uploadingFile` no `disabled` — dava pra iniciar uma
   gravação nova enquanto um upload de arquivo independente ainda estava em andamento. Corrigido:
   `disabled` agora inclui `uploadingFile`.
4. **Não corrigido, aceito como limitação documentada**: `hasAudioMagicBytes` assume que o box
   `ftyp` de um MP4/M4A está exatamente no offset 4 — um arquivo remuxado com um box `free`/`skip`
   antes do `ftyp` seria rejeitado como "não parece áudio" mesmo sendo um M4A válido. Gravações
   diretas de celular praticamente sempre colocam `ftyp` primeiro (avaliação do próprio review);
   corrigir de verdade exigiria um parser de boxes MP4 pra escanear mais fundo no arquivo, esforço
   desproporcional ao risco real pro caso de uso desta tarefa.
