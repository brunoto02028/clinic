# QA — Atividade 064

## T-1: Schema

- API/infra: `npx prisma db push` local sem erro; `npx prisma generate` reflete o novo model/enum;
  nenhum model existente foi alterado além da adição de relações inversas.

## T-2: Upload incremental de chunk

### API
1. `POST /api/admin/clinical-scribe/sessions` sem sessão → 401. Como THERAPIST/ADMIN válido →
   201, `{ sessionId }`, `status: RECORDING` no banco.
2. `POST .../sessions/{id}/chunk` com sessão de outra clínica → 403/404 (não vaza existência da
   sessão). Com sessão própria, chunk válido → 200, `chunkCount` incrementado, objeto aparece no
   R2 na chave esperada.
3. `chunk` numa sessão já `ENDED`/`TRANSCRIBED` → rejeitado (400), não aceita chunk fora de
   `RECORDING`.
4. Chunk inválido (não é áudio, vazio) → 400, sem criar objeto no R2.

### UI
5. Iniciar gravação no Ambient Scribe → sessão criada, cronômetro rodando.
6. Deixar gravar ~90s (2-3 timeslices) → confirmar via banco/R2 que os chunks foram chegando
   progressivamente, não só no final.
7. Fechar a aba (sem clicar Stop) no meio de uma gravação de teste → reabrir, confirmar no
   banco/R2 que os chunks enviados até aquele momento continuam íntegros.

## T-3: Indicador de segurança + beforeunload

### UI
1. Durante gravação normal, o indicador "salvo até X:XX" avança condizente com os chunks
   confirmados.
2. Simular falha de rede (ex. offline no devtools) durante alguns segundos → indicador mostra
   estado de "salvando.../falha", sem derrubar a gravação; ao restaurar a rede, retry automático
   recupera e o indicador volta a avançar.
3. Tentar fechar a aba com gravação ativa → aviso nativo do browser aparece.
4. Fechar a aba depois de "Stop" → sem aviso nenhum.

## T-4: Finalização e merge

### API
1. `POST .../sessions/{id}/finish` numa sessão de outra clínica → 403/404.
2. `finish` numa sessão própria `RECORDING` → 200, status vira `ENDED` e progride pra `MERGING`.
3. `finish` numa sessão já finalizada → idempotente ou erro claro (definir comportamento na
   implementação e documentar aqui/no report).

### Funcional
4. Sessão com 5+ chunks → arquivo mesclado no R2, tocado manualmente, reproduz a gravação inteira
   sem cortes nem trechos fora de ordem.
5. Sessão com 1 chunk só (gravação curta de teste) → merge trivial funciona igual.

## T-5: AssemblyAI

### API/integração
1. Sessão `ENDED`→`MERGING`→`TRANSCRIBING` some da fila de polling assim que a AssemblyAI conclui
   (`status: completed` do lado deles), vira `TRANSCRIBED` no nosso banco.
2. Forçar um erro (ex. áudio corrompido de propósito, ou simular resposta de erro da API) →
   `status: FAILED`, `error` com mensagem legível, sessão não fica presa em `TRANSCRIBING` pra
   sempre.
3. Transcript salvo tem speakers claramente distintos (rótulos conforme a Suposição 6 decidida).
4. Português (gravação de teste em PT-BR) transcrito e diarizado corretamente.
5. Se `AI_STRICT_MODE=true` e a Suposição 1 foi respondida como "deve gatear" — confirmar que a
   submissão falha explicitamente com mensagem clara, sem tentar mandar áudio pra AssemblyAI.

## T-6: Transcript + SOAP

### UI
1. Sessão `TRANSCRIBED` exibe transcript legível com player de áudio funcional.
2. Editar rótulos de speaker (se aplicável) reflete corretamente na exibição.
3. Associar paciente a uma sessão sem paciente prévio → persiste, aparece na ficha/histórico dali
   em diante.
4. "Generate SOAP" com transcript bem rotulado produz nota coerente (S/O/A/P atribuídos
   corretamente — dor relatada pelo PACIENTE não vira "observação do terapeuta" por engano).
5. Sessão `MERGING`/`TRANSCRIBING` → estado de "processando" claro, sem erro no console.
6. Sessão `FAILED` → erro legível + opção de tentar de novo.

## T-7: Histórico

### API
1. `GET .../sessions` sem sessão → 401. Staff de clínica A não vê sessões da clínica B.

### UI
2. Lista ordenada por mais recente, com data/duração/paciente/status visíveis.
3. Sessões sem paciente associado destacadas/filtráveis.
4. Clicar numa sessão abre a tela de detalhe correta (T-6).

## T-8: Upload de áudio completo (offline/externo)

### API
1. `POST .../sessions/upload` sem sessão → 401. Arquivo de áudio válido → 201, sessão criada
   direto em `MERGING`/`TRANSCRIBING`, `mergedAudioR2Key` preenchido sem passar por chunk nenhum.
2. Arquivo maior que o teto definido → 400, mensagem clara.
3. Arquivo de tipo inválido (ex. `.txt` renomeado pra `.mp3`) → 400.
4. Staff de clínica A não consegue associar/consultar upload de clínica B.

### UI
5. Modo "Gravação local" no Ambient Scribe: gravar com a rede desligada (offline no devtools) do
   início ao fim → nenhuma chamada de rede até o "Stop" → ao finalizar, com rede restaurada, envia
   o áudio completo de uma vez e segue o pipeline normal até `TRANSCRIBED`.
6. Upload manual de um arquivo de áudio existente (gravado em outro app/dispositivo) → mesmo
   resultado final.
7. Indicador visual deixa claro que o modo local não está protegido em tempo real (diferente do
   indicador do T-3), sem confundir o usuário achando que está "salvo" antes de enviar.
