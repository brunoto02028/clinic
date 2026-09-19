# T-5: Integração AssemblyAI (submissão + polling)

**Status:** pendente
**Depende de:** T-4 ou T-8 (qualquer um dos dois caminhos que preenche `mergedAudioR2Key`)

## Objetivo
O áudio mesclado vira um transcript diarizado — "Terapeuta:" separado de "Paciente:".

## Contexto
Ver plan.md, Suposição 1 (gate de `AI_STRICT_MODE`) — **confirmar essa resposta do Bruno antes de
implementar esta tarefa especificamente**, mesmo que o resto da atividade já esteja em andamento.
Fatos da API já levantados no plan.md (upload, `speaker_labels`, polling, limites, suporte a
PT-BR).

## Passos
1. Nova env var `ASSEMBLYAI_API_KEY` — adicionar ao `.env` local e à Coolify (produção) quando for
   deployar; documentar no `.env` com o mesmo padrão de comentário das outras chaves de API.
2. `lib/ambient-recording.ts` (mesmo arquivo do T-4): função `submitToAssemblyAI(session)` — **nunca
   usa `r2PublicUrl()`** (áudio de consulta é sensível demais pra link público, ver plan.md Decisão
   7). Busca o objeto do R2 server-side (GetObjectCommand, mesmo client S3 de `lib/r2.ts`), faz
   `POST https://api.assemblyai.com/v2/upload` com os bytes (header `authorization:
   $ASSEMBLYAI_API_KEY`, sem "Bearer"), pega o `upload_url` que a AssemblyAI devolve (esse sim é
   deles, não nosso — tudo bem), e só então `POST /v2/transcript` com `{ audio_url: uploadUrl,
   speaker_labels: true, language_code: session.language === "pt" ? "pt" : "en" }`, salva
   `assemblyaiTranscriptId`.
   Se `AI_STRICT_MODE=true` e a Suposição 1 tiver sido respondida como "gatear" — checar isso
   ANTES de submeter, e falhar explicitamente (`status: FAILED`, `error` claro) em vez de
   submeter mesmo assim.
3. Job de polling em `lib/background-jobs.ts`, seguindo o padrão exato de
   `generatePendingEvidenceReports` — nova função `pollAmbientTranscriptions()`, roda a cada
   ~30-60s (transcrição costuma ser mais rápida que a geração de evidência, mas não instantânea),
   busca sessões `TRANSCRIBING` com `assemblyaiTranscriptId`, consulta
   `GET /v2/transcript/{id}`. Se `status: completed` — formata o `utterances` (array com `speaker`
   e `text` por trecho) como texto legível (`"Terapeuta: ...\nPaciente: ..."`, mapeando os labels
   de speaker da AssemblyAI pro papel certo — ver Suposição nova abaixo), salva em `transcript`,
   `status: TRANSCRIBED`. Se `status: error` — `status: FAILED`, `error` com a mensagem da
   AssemblyAI. `attempts` limita retries de erros transitórios (mesmo padrão do T-5 da atividade
   63... digo, do job de evidence report).
4. Registrar `setInterval` e `setTimeout` inicial em `startBackgroundJobs()`
   (`lib/background-jobs.ts`), junto dos outros jobs já registrados.

## Suposição nova (não estava no plan.md original, achei durante o detalhamento)
A AssemblyAI identifica speakers como "A", "B", "C" — ela **não sabe** qual é o terapeuta e qual é
o paciente. Pra virar "Terapeuta:"/"Paciente:" de verdade, alguém precisa dizer qual label é qual
— proposta mais simples: assumir que quem fala primeiro/mais é o terapeuta (heurística fraca) OU
mostrar os dois rótulos genéricos ("Speaker A:"/"Speaker B:") no transcript bruto e deixar o Bruno
trocar manualmente na tela do T-6 antes de gerar o SOAP (mais confiável, menos "mágica"). **Registrar
como pergunta pro Bruno decidir junto com as outras Suposições do plan.md antes de implementar
esta tarefa.**

## Arquivos afetados
- `.env` (nova var, não committar o valor real)
- `lib/ambient-recording.ts`
- `lib/background-jobs.ts`

## Critérios de aceite
- [ ] Sessão `TRANSCRIBING` some da fila assim que a AssemblyAI termina, vira `TRANSCRIBED`.
- [ ] Transcript salvo tem as falas claramente atribuídas a rótulos distintos (terapeuta/paciente
      ou Speaker A/B, conforme a decisão tomada).
- [ ] Erro da AssemblyAI (ex. áudio corrompido) vira `status: FAILED` com mensagem legível, nunca
      trava a sessão em `TRANSCRIBING` pra sempre.
- [ ] Se `AI_STRICT_MODE` estiver ligado E a Suposição 1 tiver sido respondida como "deve gatear" —
      confirmar que a submissão falha explicitamente em vez de silenciosamente prosseguir.
