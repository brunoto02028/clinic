# QA Report — T-3: Indicador "salvo até X:XX" + aviso beforeunload
### (+ revalidação de 4 correções de segurança/robustez do T-2, pós code-review)

**Data:** 2026-09-19
**Resultado geral:** ✅ aprovado

## Resumo

| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | `actor.clinicId` null — guard antes de qualquer query + isolamento cross-tenant (404) | API | ✅ |
| 2 | Chunk sem `chunkIndex` → 400 `Invalid chunkIndex` | API | ✅ |
| 3 | Mesmo `chunkIndex` duas vezes (retry) → idempotente, `chunkCount` não incrementa, bytes não sobrescritos | API | ✅ |
| 4 | Indicador "salvo até X:XX" avança conforme chunks confirmam | UI | ✅ |
| 5 | Falha de rede durante gravação → aviso + retry automático + recuperação | UI | ✅ |
| 6 | Fechar aba com gravação ativa → aviso nativo do browser | UI | ✅ |
| 7 | "Stop" espera uploads pendentes antes de finalizar | UI/API | ✅ |
| 8 | Fechar aba depois de "Stop" finalizado → sem aviso | UI | ✅ |

## Observação de processo

Durante os testes de UI, o agente encontrou brevemente o indicador ausente do DOM — investigou a
fundo e concluiu que era edição concorrente do mesmo arquivo (eu estava implementando o T-4 em
paralelo, que toca o mesmo `page.tsx`). Depois disso o arquivo estabilizou e todos os cenários
passaram limpos, com evidência em screenshot. Não é um bug do T-3 — é um lembrete de não rodar QA
de UI num arquivo sendo editado ao vivo; vou evitar isso daqui pra frente (esperar QA terminar
antes de tocar o mesmo arquivo de novo).

## Detalhes

### Revalidação T-2 (API)

Setup: duas clínicas + dois THERAPISTs de teste via script local, login pelo Portal da Equipe.

**1. `actor.clinicId` null + isolamento cross-tenant ✅** — guard confirmado por leitura de código
antes de qualquer query. Teste funcional cross-tenant: sessão da Clínica A, chunk enviado como
staff da Clínica B → 404, nenhum objeto criado no R2 pela tentativa.

**2. Chunk sem `chunkIndex` ✅** — 400 `{"error":"Invalid chunkIndex"}`.

**3. `chunkIndex` duplicado (retry) ✅** — 1ª chamada (8 bytes) → 200, `chunkCount:1`. 2ª chamada
mesmo índice, bytes diferentes (10 bytes) → 200, `chunkCount:1, duplicate:true`. Conteúdo real do
objeto no R2 confirmado via `GetObjectCommand`: ainda os 8 bytes originais, não sobrescrito.

### T-3 (UI)

**4. Indicador avança conforme chunks confirmam ✅** — "Waiting for the first automatic save…" →
~30s depois "Safely saved up to 00:30", confirmado por chunk real no banco.

**5. Falha de rede + retry + recuperação ✅** — sobrescrevendo `window.fetch` temporariamente pra
`.../chunk`: indicador virou "Couldn't save the last chunk — retrying automatically" + toast;
restaurando o fetch, o chunk seguinte recuperou pra "Safely saved up to 01:30".

**6. beforeunload com gravação ativa ✅** — diálogo nativo apareceu, cancelar manteve a gravação
rodando normalmente.

**7. Stop espera uploads pendentes ✅** — sessão de ~116s (3 chunks automáticos) terminou com
`chunkCount=4` no banco (inclui o chunk final). Sessão curta (~5-8s) terminou com `chunkCount=1`.

**8. Fechar aba depois de Stop finalizado ✅** — navegação instantânea, sem diálogo, confirmando
que o listener de `beforeunload` foi removido.

## Erros de console
Nenhum, em nenhum fluxo testado.

## `npx tsc --noEmit -p .`
1898 erros após filtrar `reconstruir/` — igual ao baseline, nenhum novo.

## Limpeza realizada
Nenhuma gravação ficou ativa ao final. 23 objetos deletados do bucket R2 sob
`consultation-sessions/`. 8 registros `AmbientRecordingSession` de teste apagados. Scripts
temporários apagados. Clínicas/terapeutas de teste (`qa-scribe-clinic-a`/`b`) mantidos no banco
local (fixtures QA reutilizáveis, sem risco).

## Falhas e recomendações
Nenhuma falha real de código.
