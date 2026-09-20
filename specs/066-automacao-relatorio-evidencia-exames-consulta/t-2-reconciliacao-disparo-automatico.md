# T-2: Reconciliação automática do disparo + fila de reprocessamento

**Status:** concluído
**Depende de:** T-1 (usa o campo `needsReprocessing` criado lá)

## Objetivo
Nenhum paciente com triagem completa fica sem relatório gerado por mais de um ciclo do job em
background — mesmo que o enqueue inicial (na submissão da triagem) falhe silenciosamente. E todo
relatório marcado `needsReprocessing: true` (por um documento novo — ver T-1) é reprocessado no
próximo ciclo, sem intervenção manual.

## Contexto
Ver `plan.md`, Decisão 0 e 6. Dois problemas relacionados, mesmo mecanismo de correção:
1. Achado real nesta sessão: 3 pacientes (Eduardo Nogueira, Daniel To, Gabby Boss) tinham triagem
   `isSubmitted: true` há dias sem nenhum `ClinicalEvidenceReport`, sem registro do motivo (enqueue
   em `app/api/medical-screening/route.ts` é fire-and-forget, só `console.error`). Mesmo padrão de
   auto-heal já existe em `relinkBrokenEvidenceReport` (`lib/evidence-report.ts`) pra um caso mais
   estreito (relatório sem `screeningId`) — esta tarefa generaliza pra "triagem sem relatório
   nenhum".
2. T-1 introduz `needsReprocessing: true` como a forma de marcar "chegou documento novo, precisa
   reprocessar" sem criar uma linha nova nem mudar o status imediatamente. Alguém precisa
   efetivamente pegar essas marcas e rodar `generateEvidenceReport` de novo — é o mesmo job que já
   existe, só ganha mais uma fonte de trabalho.

## Passos
1. `lib/evidence-report.ts` (ou um novo helper) — função `reconcileMissingEvidenceReports()`: busca
   `MedicalScreening` com `isSubmitted: true` cujo `userId` não tem nenhum `ClinicalEvidenceReport`
   (qualquer status), e cria uma linha `GENERATING` pra cada um encontrado — mesmo formato do
   enqueue que já existe no submit.
2. `lib/background-jobs.ts`, `generatePendingEvidenceReports` (ou uma função vizinha no mesmo
   arquivo) — no mesmo ciclo de 2 minutos: (a) chama `reconcileMissingEvidenceReports()`; (b) busca
   relatórios com `needsReprocessing: true`, reivindica cada um (`updateMany` condicional, mesmo
   padrão de claim já usado no resto do job) trocando `needsReprocessing: false` +
   `status: GENERATING`, e chama `generateEvidenceReport(id)` — o próprio `generateEvidenceReport`
   já sabe reprocessar do zero (achados de documento incluídos, via T-1), não precisa de um caminho
   de código separado pra "reprocessar" vs. "gerar pela primeira vez".
3. Teto por ciclo pros dois casos (reconciliação de triagens órfãs e fila de reprocessamento) —
   pro caso de um bug maior deixar muita coisa pendente de uma vez, não estourar o orçamento de IA
   de um ciclo só. Mesmo limite/`take` já usado no restante do job.

## Arquivos afetados
- `lib/evidence-report.ts`
- `lib/background-jobs.ts`

## Implementação

- `lib/evidence-report.ts` — `reconcileMissingEvidenceReports()` (exportado): busca triagens
  `isSubmitted && consentGiven` (teto 500 por chamada), compara com quem já tem
  `ClinicalEvidenceReport` (`distinct: patientId`), cria `GENERATING` pros primeiros 10 órfãos
  encontrados. Falha de criação individual (corrida rara entre dois ciclos) é logada e não trava o
  restante do lote.
- `lib/background-jobs.ts`, `generatePendingEvidenceReports` — chama `reconcileMissingEvidenceReports()`
  no início do ciclo; em seguida promove relatórios `needsReprocessing: true` (exceto os que já
  estão `GENERATING` nesse exato momento, pra não atropelar um processamento em andamento) pra
  `status: GENERATING, attempts: 0`, sem teto explícito nessa promoção — o teto de custo real já
  existe na etapa seguinte (`take: 3` na busca de pendentes), que processa todas as fontes
  (submissão nova, reconciliação, promoção) pela mesma fila justa.
- **Decisão importante de corrida, documentada no código**: `generateEvidenceReport` NUNCA escreve
  `needsReprocessing` — só o passo de promoção acima limpa a flag, atomicamente com a virada pra
  `GENERATING`, ANTES de chamar `generateEvidenceReport`. Se a própria função limpasse a flag no
  final (por exemplo, sempre `false` ao terminar com sucesso), um documento chegando NO MEIO do
  processamento (depois que `loadDocumentFindings` já rodou, então fora dessa rodada) teria sua
  marca `needsReprocessing: true` (posta corretamente por `notifyNewClinicalDocument` enquanto o
  status ainda era `GENERATING`) apagada silenciosamente pela própria geração que acabou de
  terminar sem incluir esse documento. Comentário extenso deixado na função pra não reintroduzirem
  isso por engano numa próxima mudança.

`npx tsc --noEmit` e `npx next build` limpos, nenhum erro novo.

## QA

QA (agente qa-tester): 9/9 cenários aprovados, incluindo o mais crítico (documento chegando NO
MEIO de uma geração — a flag `needsReprocessing` sobrevive corretamente, confirmado
empiricamente) e a reivindicação atômica do `updateMany` de promoção sob concorrência real
(`Promise.all`, Postgres serializa corretamente). `qa/report-t-2.md`.

## Code review

4 achados reais, todos corrigidos:
1. **`reconcileMissingEvidenceReports` sem `try/catch` no nível da função** — uma falha transitória
   de banco (pool esgotado, timeout) propagava pra fora, sendo capturada só pelo `try/catch` externo
   de `generatePendingEvidenceReports`, que aborta o CICLO INTEIRO — não só a reconciliação, mas
   também a promoção, o give-up e o processamento real de relatórios pendentes daquele ciclo.
   **Corrigido**: função agora nunca propaga erro, mesma disciplina já usada em
   `notifyNewClinicalDocument`.
2. **Teto de 500 triagens carregadas em memória antes de filtrar quem não tem relatório** — sem
   ordenação nem filtro no nível do banco, um sistema com mais de 500 triagens submetidas no total
   deixaria órfãos fora dessa janela permanentemente invisíveis, e uma clínica com volume alto
   podia ocupar a janela toda, "esfomeando" clínicas menores. **Corrigido**: filtro movido pro
   banco (`user: { evidenceReportsAsPatient: { none: {} } }`), sem carregar nada em memória pra
   filtrar — elimina o problema por construção, sem precisar de teto artificial.
3. **Passo de promoção sem teto** — uma rajada de documentos podia marcar centenas de relatórios
   `needsReprocessing: true` de uma vez; a promoção os levava todos pra `GENERATING` juntos, mas só
   3 por ciclo são de fato processados (teto já existente) — os outros ficavam com a tela mostrando
   "gerando..." por horas sem terem sequer começado. **Corrigido**: promoção agora também tem teto
   de 10 por ciclo, igual à reconciliação.
4. **Busca de `clinicId` sequencial, um `findUnique` por órfão dentro do loop** — trocado por uma
   busca em lote (`findMany` com `id: { in: [...] }`) antes do loop.

`npx tsc --noEmit`/`npx next build` limpos após as correções.

## Critérios de aceite
- [ ] Uma triagem `isSubmitted: true` sem nenhum `ClinicalEvidenceReport` (simulado apagando a
      linha de um relatório de teste) ganha uma linha `GENERATING` no próximo ciclo do job (até
      2 minutos), sem ação manual.
- [ ] Paciente que já tem relatório (em qualquer status) nunca ganha um segundo pela reconciliação
      de triagens órfãs.
- [ ] Reconciliação não recria relatório pra triagem em rascunho/autosave (`isSubmitted: false`).
- [ ] Relatório marcado `needsReprocessing: true` é pego e reprocessado no próximo ciclo (até
      2 minutos), incluindo o(s) documento(s) novo(s) que motivaram a marca.
- [ ] Dois ciclos do job não processam a mesma marca de reprocessamento duas vezes (claim
      condicional, mesmo padrão já usado no resto do job).
- [ ] Volume grande de triagens/marcas pendentes de uma vez não satura o job (teto por ciclo).
- [ ] Isolamento cross-tenant: reconciliação/reprocessamento nunca cria ou altera relatório
      vinculado à clínica errada.
