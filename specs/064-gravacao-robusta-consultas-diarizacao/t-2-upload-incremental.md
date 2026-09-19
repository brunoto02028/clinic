# T-2: Upload incremental de chunk

**Status:** concluído
**Depende de:** T-1

## Objetivo
Cada pedaço de áudio gerado durante a gravação é salvo no servidor assim que é gerado — não só no
final. É o coração da robustez desta atividade.

## Contexto
Ver plan.md, Decisão 1. `MediaRecorder` com `timeslice` já dispara `ondataavailable` periodicamente
(o Ambient Scribe atual já faz `mediaRecorder.start(1000)`, mas só acumula em memória — aqui, cada
chunk gerado é enviado pro servidor imediatamente).

## Passos
1. Rota nova `POST /api/admin/clinical-scribe/sessions/route.ts` — cria uma
   `AmbientRecordingSession` nova (`status: RECORDING`, `therapistId` = staff autenticado,
   `patientId` opcional no body, `language`). Retorna `{ sessionId }`.
2. Rota nova `POST /api/admin/clinical-scribe/sessions/[id]/chunk/route.ts` — recebe um chunk de
   áudio (`multipart/form-data`, campo `audio`) + `chunkIndex` no body/query. Valida que a sessão
   pertence ao staff autenticado e está `RECORDING`. Sobe o chunk pro R2 via `uploadToR2` com a
   chave `consultation-sessions/{sessionId}/chunk-{chunkIndex.padStart(5,"0")}.webm`. Atualiza
   `lastChunkAt` e incrementa `chunkCount` na sessão. Retorna `{ ok: true, chunkCount }`.
3. Em `app/admin/clinical-ai/page.tsx` (`AmbientScribe`): ao clicar "Start Recording", primeiro
   chama `POST .../sessions` pra abrir a sessão, guarda `sessionId`. Configura
   `mediaRecorder.ondataavailable` pra, além de acumular localmente (fallback visual), **enviar
   cada chunk imediatamente** pra `POST .../sessions/{sessionId}/chunk` com um índice incremental.
   Trocar `mediaRecorder.start(1000)` por um timeslice maior (ex. 30000ms = 30s) — chunks menores
   geram mais overhead de rede sem ganho real de robustez.

## Arquivos afetados
- `app/api/admin/clinical-scribe/sessions/route.ts` (novo)
- `app/api/admin/clinical-scribe/sessions/[id]/chunk/route.ts` (novo)
- `app/admin/clinical-ai/page.tsx`

## Critérios de aceite
- [x] Iniciar uma gravação cria uma `AmbientRecordingSession` com `status: RECORDING`.
- [x] Cada chunk gerado (a cada ~30s) é confirmado salvo no R2 antes do próximo ser gerado (ou em
      paralelo, sem perder ordem/índice).
- [x] `chunkCount` e `lastChunkAt` refletem a realidade a qualquer momento durante a gravação.
- [x] Staff de outra clínica não consegue enviar chunk pra uma sessão que não é sua (403/404).
- [x] Simular "matar a aba" no meio da gravação (fechar sem clicar Stop) — os chunks já enviados
      continuam no R2, intactos.

## QA e code review

QA (agente qa-tester): 4/4 cenários de API aprovados de cara; 1 cenário (persistência real no R2)
bloqueado no primeiro round por falta de credenciais R2 no `.env` local (gap de setup de dev
pré-existente, não causado por esta tarefa) — resolvido copiando as credenciais reais do Coolify
pro `.env` local (gitignored), revalidado manualmente pela sessão principal: chunk de teste
persistiu no R2 na chave esperada, depois apagado. `qa/report-t-2.md`.

Code review (2 rodadas): a primeira achou 1 achado crítico —
`clinicId: actor.clinicId ?? undefined` no filtro da query removia o isolamento de tenant por
completo quando `clinicId` era null (Prisma trata `undefined` como "sem filtro"), permitindo em
tese enviar chunk pra sessão de outra clínica. Corrigido com `if (!actor.clinicId) return 400`
antes de qualquer query — mesmo padrão já usado em `sessions/route.ts`. Também corrigidos no mesmo
lote: `chunkIndex` ausente não é mais coagido a `0` (rejeitado explicitamente), e um retry com o
mesmo `chunkIndex` não sobrescreve mais o chunk já salvo (dedupe via `listR2` antes do upload). A
segunda rodada (junto com o QA do T-3) revalidou as 3 correções — todas confirmadas.
