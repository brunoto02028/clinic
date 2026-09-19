# T-3: Indicador "salvo até X:XX" + aviso beforeunload

**Status:** concluído
**Depende de:** T-2

## Objetivo
O Bruno precisa ver, em tempo real, que a gravação está sendo salva de verdade — não só confiar
que está funcionando. E ser avisado antes de fechar a aba por engano no meio de uma gravação.

## Contexto
Confiança é a metade do problema aqui — a robustez técnica do T-2 não adianta se o Bruno não
souber que ela existe enquanto está numa consulta real.

## Passos
1. No `AmbientScribe`, manter um estado `lastSavedChunkTime` (atualizado a cada confirmação bem
   sucedida de upload de chunk do T-2). Mostrar isso perto do cronômetro de gravação, ex.:
   "🔴 Gravando (12:34) — salvo com segurança até 12:00" (ou "salvando..." se o último chunk ainda
   não confirmou). Se um upload de chunk falhar, mostrar um aviso visível (não silencioso) e
   tentar de novo automaticamente (retry simples, 2-3 tentativas) antes de alertar de vez.
2. Registrar um listener `beforeunload` enquanto `isRecording === true`, cancelando o listener
   quando a gravação para (Stop) ou a sessão termina. Mensagem de aviso padrão do browser (não dá
   pra customizar o texto em navegadores modernos, mas o confirm nativo já ajuda).

## Arquivos afetados
- `app/admin/clinical-ai/page.tsx`

## Critérios de aceite
- [ ] Durante a gravação, o indicador de "salvo até" avança conforme os chunks confirmam.
- [ ] Derrubar a rede propositalmente por alguns segundos durante uma gravação de teste mostra o
      aviso de "salvando..."/falha, sem quebrar a gravação em si (ela continua rodando local e
      tenta de novo).
- [ ] Tentar fechar a aba com gravação ativa dispara o aviso nativo do browser.
- [x] Fechar a aba DEPOIS de clicar "Stop" (gravação já finalizada) não dispara aviso nenhum.

## QA e code review

QA (agente qa-tester): 8/8 cenários aprovados (3 de revalidação da API T-2 + 5 de UI do T-3),
`qa/report-t-3.md`.

Code review: 4 achados, todos corrigidos —
1. `fetch` do chunk sem timeout — uma conexão travada (não um erro imediato) nunca resolvia nem
   rejeitava, deixando a promise presa em `pendingUploadsRef` pra sempre e travando o "Stop"
   indefinidamente (e contaminando gravações futuras na mesma aba). Corrigido: `AbortSignal.timeout`
   no fetch de chunk e de finish, + reset defensivo de `pendingUploadsRef` no início de cada nova
   gravação.
2. O aviso de falha era um `boolean` único que qualquer chunk seguinte bem-sucedido apagava —
   mascarava perda real de dados de um chunk anterior que falhou de vez. Corrigido: contador
   cumulativo (`failedChunkCount`), nunca volta a zero sozinho, só reseta no início de nova
   gravação.
3. Trocar de aba dentro do Clinical AI Hub (Evidence Search/Patient Intelligence) desmontava o
   `AmbientScribe` e órfãva a gravação (MediaRecorder/timer/uploads continuavam rodando sem UI,
   sem Stop, sem aviso de beforeunload). Corrigido: troca de aba bloqueada enquanto uma gravação
   está ativa.
4. (Achado técnico, não bug de UX) `mergeSessionChunks` silenciosamente pulava um índice de chunk
   faltante sem deixar rastro — corrigido em `lib/ambient-recording.ts` (T-4) pra detectar o gap e
   registrar no campo `error` da sessão, mesmo com merge bem-sucedido.

O achado #3 acima tem a mesma causa raiz do achado crítico do QA do T-4 (cenário 7:
`VersionChecker` recarregando a página no meio de uma gravação) — "algo desmonta/recarrega a
página enquanto grava". Tratados juntos: `lib/ambient-recording-guard.ts` (novo, flag
compartilhada `isAmbientRecordingActive()`) é lido tanto pelo `VersionChecker` (adia o reload
automático) quanto seria por qualquer outro código futuro que precise saber "tem gravação rolando
agora?".
