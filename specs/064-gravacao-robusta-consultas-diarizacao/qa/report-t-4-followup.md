# QA Report — T-4 Follow-up: Correções do achado crítico do cenário 7 (report-t-4.md)

**Data:** 2026-09-19
**Resultado geral:** ✅ aprovado (após um achado crítico encontrado e corrigido em tempo real
durante esta rodada de QA)

## Contexto
Sem qa-spec.md formal — cenários derivados a partir da descrição das 4 correções feitas em cima
do que já era T-3/T-4 (aprovado em `report-t-3.md`/`report-t-4.md`), motivadas pelo achado crítico
do cenário 7 do `report-t-4.md` (`VersionChecker` recarregando durante gravação ativa).

## Resumo

| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | VersionChecker não recarrega durante gravação ativa; reload pendente ocorre depois do Stop | UI | ✅ |
| 2 | Bloqueio de troca de aba (Evidence Search/Patient Intelligence) durante gravação | UI | ✅ |
| 3 | Timeout do fetch de chunk (20s) não trava "Stop" para sempre | UI | ✅ |
| 4 | Contador cumulativo de chunks falhos não reseta sozinho | UI | ✅ |
| 5 | Regressão — gravação normal do início ao fim | UI | ✅ |
| — | Extra: recuperação de "stop espontâneo" (mic desconectado/permissão revogada) | UI | ✅ |
| — | **Achado crítico**: cleanup de `useEffect` matava o `MediaRecorder` no próprio `start()` → 0 chunks + travamento permanente do "Stop" | UI | 🔴→✅ corrigido durante a rodada |

## Nota de processo
Duas interrupções por edição concorrente do arquivo sob teste (`page.tsx`), mesmo padrão já visto
no `report-t-3.md`. O agente de QA pausou corretamente ao notar edição em andamento, e — ponto
importante — **não tratou uma mensagem de outro agente como autorização**: verificou por conta
própria antes de retomar, só seguindo após confirmação direta da sessão principal.

Depois de retomar, o agente achou um **segundo bug real, não relacionado a HMR**: toda gravação
morria em ~1s (`FAILED`, 0 chunks), e "Stop" travava a UI pra sempre, bloqueando toda navegação
sem saída. Causa raiz: o `useEffect` que sincroniza `isAmbientRecordingActive` tinha cleanup
chamando `mediaRecorderRef.current.stop()` com deps `[isRecording, finalizing,
onRecordingStateChange]` — o cleanup do React roda a cada mudança de dependência, não só no
unmount real, então matava o gravador recém-criado assim que `isRecording` virava `true` (a
própria transição inicial do `startRecording`). Corrigido pela sessão principal: dois
`useEffect`s separados (um só sincroniza a flag, sem tocar o gravador; outro só faz o `.stop()`
de segurança, com deps `[]`, cleanup só no unmount real) — e, num achado relacionado encontrado
antes deste, `onstop` do `MediaRecorder` virou a única fonte de verdade que reseta
`isRecording`/`finalizing`, não importa se o stop foi manual ou espontâneo (mic desconectado).
Revalidado nos cenários 5 e no teste extra de "stop espontâneo" abaixo.

## Detalhes

**1. VersionChecker ✅** — versão fake injetada via `page.route` em `/api/version`, gatilho de
`visibilitychange` disparado via `Object.defineProperty`. Durante gravação: reload NÃO ocorreu
(marcador `window.__qaMarker` intacto, timer seguindo). Depois do Stop, gatilho disparado de novo:
reload ocorreu de verdade. Evidência: `t4-followup-versionchecker-blocked.png`.

**2. Bloqueio de troca de aba ✅** — botões "Evidence Search"/"Patient Intelligence" ficam
`disabled` de verdade durante gravação. Gravação seguiu intacta. Depois do Stop, voltaram a
funcionar. Evidência: `t4-followup-tab-switch-blocked.png`.

**3. Timeout do fetch de chunk ✅** — requisição de chunk interceptada pra nunca responder:
abortou em ~20s, retry 3x, indicador ficou vermelho, "Stop" funcionou normalmente depois. Timeout
de 120s do `finish` validado só por leitura de código (não testado ao vivo — custo/benefício de
simular um merge real de 2min).

**4. Contador cumulativo ✅** — 1º chunk forçado a falhar 3x (500), indicador vermelho; 2º chunk
sucedeu (200); indicador **continuou vermelho**. Evidências:
`t4-followup-failed-chunk-red.png`, `t4-followup-failed-chunk-red-persists.png`.

**5. Regressão ✅** — gravação de ~2min, 4 chunks automáticos, Stop → `status: TRANSCRIBING`,
`chunkCount: 4`, `mergedAudioR2Key` preenchido, `durationSeconds: 120`, indicador sempre "Safely
saved up to...", sem erro de console. Evidência: `t4-followup-regression-safely-saved.png`.

**Extra — stop espontâneo ✅** — `track.stop()` chamado diretamente (simula mic desconectado): UI
se recuperou sozinha, sessão finalizou em `TRANSCRIBING`. Evidência:
`t4-followup-spontaneous-stop-recovered.png`.

**Bug antes da correção:** `t4-followup-BUG-stuck-finalizing.png`.

## Erros de console
Nenhum inesperado — só os `500`/`net::ERR_ABORTED` propositais dos cenários 3 e 4.

## `npx tsc --noEmit -p .`
1898 erros (filtrando `reconstruir/`) — baseline, nenhum novo. Confirmado de forma independente
duas vezes.

## Limpeza realizada
Nenhuma gravação ativa ao final. 9 sessões de teste apagadas do banco (0 remanescentes, confirmado
independentemente). 26 objetos apagados do R2 sob `consultation-sessions/` (0 remanescentes,
confirmado independentemente). Nenhum script temporário deixado. Fixtures `qa-scribe-clinic-a`/`b`
mantidas, senha resetada para `QaScribe064!`.

## Recomendações
- Testar ao vivo o timeout de 120s do `finish` numa rodada futura não bloqueante.
- Teste de UI dedicado ao guard de clique em `<a href>` fora do Clinical AI Hub (hoje só validado
  por leitura de código).
