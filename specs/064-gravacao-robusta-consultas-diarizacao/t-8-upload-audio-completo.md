# T-8: Upload de áudio completo (gravação local/offline ou arquivo externo)

**Status:** pendente
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
- [ ] Escolher "Gravação local", gravar, parar, e o áudio é enviado de uma vez ao finalizar —
      sessão segue o mesmo caminho até `TRANSCRIBED` que uma gravação ao vivo.
- [ ] Enviar um arquivo de áudio já existente (ex. gravado num celular, formato comum como
      m4a/mp3/opus) funciona e processa normalmente.
- [ ] Arquivo maior que o teto definido é rejeitado com mensagem clara, não trava a UI.
- [ ] Arquivo de tipo inválido (não é áudio) é rejeitado.
- [ ] Simular gravação local sem internet do início ao fim (offline no devtools durante toda a
      gravação) → nenhuma chamada de rede até o envio final ao "Stop" (confirmar que o modo local
      realmente não depende de conectividade durante a gravação).
- [ ] Isolamento cross-tenant: staff só consegue criar/ver sessões da própria clínica.
