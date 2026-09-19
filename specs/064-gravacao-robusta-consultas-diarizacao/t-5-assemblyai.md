# T-5: Integração AssemblyAI (submissão + polling)

**Status:** concluído
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
- [x] Se `AI_STRICT_MODE` estiver ligado E a Suposição 1 tiver sido respondida como "deve gatear" —
      confirmar que a submissão falha explicitamente em vez de silenciosamente prosseguir.

## QA e code review

Chave da AssemblyAI obtida com o Bruno (login dele, sessão principal navegou até a página de API
Keys e cadastrou direto no `.env` local e no Coolify, sem nunca exibir o valor em texto).

Confirmado pela sessão principal antes do QA formal, com chamadas reais: (1) `AI_STRICT_MODE=true`
(valor local) bloqueia a submissão, sessão vai pra `FAILED` com mensagem clara; (2) com a trava
desligada (override só no processo, sem tocar `.env`), uma sessão real chega em `TRANSCRIBED` com
transcript formatado. Achado nessa investigação: `AI_STRICT_MODE` não está configurado em
produção (efetivamente `false` lá) — divergência pré-existente do projeto, não desta atividade;
Bruno decidiu deixar como está por enquanto (fora do escopo mexer na política geral de IA do
projeto).

QA (agente qa-tester): 6/8 cenários aprovados sem ressalva, 2 com ressalva de cobertura (diarização
com 2+ speakers reais não observada — limitação do ambiente de teste sem microfone/voz PT-BR;
acurácia de conteúdo em PT-BR não verificada, só a mecânica do `language_code`). `qa/report-t-5.md`.

**Achado crítico do QA, corrigido e revalidado**: o guard de `attempts >= 5` só cobria a fase de
SUBMISSÃO — uma falha persistente no polling (ex. `assemblyaiTranscriptId` inválido, chave
revogada) deixava a sessão presa em `TRANSCRIBING` pra sempre. Corrigido: o guard agora cobre as
duas fases, incrementando `attempts` só em falha real de fetch (nunca em "ainda processando").
Revalidado pela sessão principal: sessão de teste com ID inexistente evoluiu attempts 0→5 e
resolveu pra `FAILED` corretamente.

Code review: 3 achados —
1. Corrida rara num crash exato entre a AssemblyAI aceitar o job e o `assemblyaiTranscriptId`
   commitar no banco — poderia gerar submissão duplicada (custo, não perda de dado). **Não
   corrigido** — aceito como limitação documentada; corrigir de verdade exigiria idempotência do
   lado da AssemblyAI ou um estado intermediário que teria sua própria janela de corrida, custo
   desproporcional ao risco (raro, sem impacto de correção/dado, só custo duplicado ocasional).
2. Ciclos do job podem se sobrepor (um tick demorado + `setInterval` não espera o anterior
   terminar) e a fase de polling não tinha claim nenhum, incluindo o incremento de `attempts` sem
   checar status. Corrigido: guard de reentrância no processo (`ambientTranscriptionsRunning`) +
   incremento de `attempts` no polling agora condicional a `status: "TRANSCRIBING"`.
3. O campo `error` era sobrescrito sem piedade em toda falha da AssemblyAI, destruindo o aviso de
   chunk faltante que `mergeSessionChunks` grava lá de propósito. Corrigido: helper `combineError`
   concatena em vez de substituir, em todos os pontos de escrita.
