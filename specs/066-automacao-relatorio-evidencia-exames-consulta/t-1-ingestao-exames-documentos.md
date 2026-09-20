# T-1: Ingestão de exames/documentos + reabertura automática quando chega documento novo

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Quando o paciente sobe um documento/exame relevante (`PatientDocument`), o relatório de evidência
passa a considerar o achado clínico real — tanto no resumo do caso quanto nas buscas de literatura
— **e isso acontece toda vez que um documento novo chega, não só na primeira geração**. O paciente
frequentemente vai lembrando de exames e anexando aos poucos ao longo de dias; o relatório precisa
se enriquecer sozinho a cada novo documento, sem esperar o Bruno notar e regenerar manualmente.

## Contexto
Ver `plan.md`, Decisão 0 (mecanismo de reabertura, já validada pelo Bruno) e Decisões 1-5
(extração). `lib/docling.ts` (`extractText`) já existe e já é usado pelo fluxo "AI Import" — esta
tarefa conecta essa extração ao pipeline de `generateEvidenceReport`, sem construir nada novo de
extração de PDF. Extração nunca bloqueia a geração do relatório (mesmo padrão de resiliência da
busca de literatura, que já engole falha de uma query individual).

**Regra de reabertura (Decisão 0, já confirmada com o Bruno):**
- Sem relatório ainda → cria um novo (`GENERATING`).
- Relatório mais recente não aprovado (`GENERATING`/`DRAFT`/`UNDER_REVIEW`) → o MESMO relatório é
  marcado pra reprocessar, sem criar linha nova (isso é "enriquecer").
- Relatório mais recente `APPROVED` → cria uma versão NOVA, nunca mexe na aprovada.

## Passos
1. **Schema** — campo novo em `ClinicalEvidenceReport`: `needsReprocessing Boolean @default(false)`
   (marca "tem documento novo esperando ser incorporado", sem forçar o status pra `GENERATING`
   imediatamente — evita que a tela pareça "sumir" o conteúdo pra quem estiver lendo no momento em
   que um documento chega; o job troca pra `GENERATING` só quando realmente for processar).
2. **Trigger central** — um helper compartilhado (ex. `lib/evidence-report.ts`,
   `notifyNewClinicalDocument(patientId)`) que implementa a regra de reabertura acima: acha o
   relatório mais recente do paciente, decide entre marcar `needsReprocessing: true` no mesmo ou
   criar um novo `GENERATING`, vinculado à triagem atual do paciente.
3. Chamar esse helper nos pontos onde um `PatientDocument` clinicamente relevante é criado:
   `app/api/patient/documents/route.ts` (upload pelo portal do paciente), `app/api/admin/patients/[id]/documents/route.ts`
   (upload pelo staff), e `app/api/admin/patients/[id]/ai-import/route.ts` (documentos entram por
   ali também). Só dispara pra tipos clinicamente relevantes (ver Suposição 4 do plan.md) — upload
   de um `CONSENT_FORM`, por exemplo, não deveria reabrir nada.
4. `lib/evidence-report.ts`, `generateEvidenceReport` — antes de montar o `caseSummary`, buscar
   `PatientDocument` do paciente com `documentType` relevante.
5. Pra cada documento sem `extractedText` ainda: buscar o arquivo (mesmo padrão de acesso já usado
   em `/api/files/[id]`, nunca expor publicamente), chamar `extractText` do `lib/docling.ts`, e
   gravar o resultado de volta em `PatientDocument.extractedText` (cache — próxima geração não
   re-extrai o mesmo documento). Envolver cada extração num `try/catch` individual — uma falha num
   documento não deve afundar o relatório inteiro nem os outros documentos.
6. Resumir os achados extraídos (resumo direto do texto, ou uma chamada de IA curta pra extrair só
   o essencial clínico, dado que um laudo de RM inteiro é longo) e incluir no `caseSummary` (novo
   campo, ex. `caseSummary.documentFindings: string[]`).
7. Alimentar `buildQueries` (`lib/europe-pmc.ts`) com os achados extraídos como dimensão extra de
   busca — não só `condition`/`region` da triagem, mas também termos vindos do exame (ex. "fratura
   por insuficiência subcondral" virando uma query real). Confirmar que o prompt de síntese
   (`SYSTEM_PROMPT` em `lib/evidence-report.ts`) continua exigindo `sourceRef` de uma fonte real
   pra qualquer sugestão — inclusive as que vierem de achado de exame.

## Arquivos afetados
- `prisma/schema.prisma`
- `lib/evidence-report.ts`
- `lib/europe-pmc.ts` (se `buildQueries` precisar de um parâmetro novo)
- `app/api/patient/documents/route.ts`
- `app/api/admin/patients/[id]/documents/route.ts`
- `app/api/admin/patients/[id]/ai-import/route.ts`

## Implementação

- `prisma/schema.prisma` — campo novo `needsReprocessing Boolean @default(false)` em
  `ClinicalEvidenceReport`. Aplicado em local e produção.
- `lib/evidence-report.ts` — `notifyNewClinicalDocument(patientId, documentType)` (exportado,
  implementa os 3 casos da Decisão 0: sem relatório → cria; `APPROVED`/`SENT_TO_PATIENT`/`ARCHIVED`
  → cria versão nova; qualquer outro status → marca `needsReprocessing: true`). `loadDocumentFindings`
  (privado) — busca `PatientDocument` de tipo clinicamente relevante, extrai texto via
  `lib/docling.ts` quando falta (cacheado em `extractedText`), resume o achado clínico via IA
  (cacheado em `aiSummary`), tudo dentro de `try/catch` por documento. `generateEvidenceReport`
  passa a incluir `caseSummary.documentFindings` e alimentar `buildQueries` com eles.
  **Correção nesta nota** (versão anterior desta seção dizia "todo caminho de saída da função
  zera `needsReprocessing`" — isso mudou ao implementar a T-2 logo em seguida, ver
  `t-2-reconciliacao-disparo-automatico.md`: `generateEvidenceReport` NUNCA escreve
  `needsReprocessing`, só o claim step da T-2 limpa a flag, por causa de uma corrida real —
  documentado no código e na T-2, não é escopo/critério de aceite da T-1).
- `lib/europe-pmc.ts` — `buildQueries` ganhou o parâmetro `documentFindings`, cada achado vira uma
  query extra (`"<achado> treatment"`), teto subiu de 4 pra 6 queries totais.
- `lib/patient-documents.ts` — `storePatientDocument` (usado por TODOS os caminhos de upload:
  portal do paciente, admin, AI Import) chama `notifyNewClinicalDocument` depois de salvar,
  aguardado (são só chamadas Prisma rápidas, sem IA/extração síncrona aqui).
- `app/api/admin/patients/[id]/ai-import/route.ts` — os dois pontos que criam `PatientDocument`
  fora de `storePatientDocument` (entradas de histórico geradas pela IA e a nota de texto do
  terapeuta) também chamam `notifyNewClinicalDocument`, já que carregam a classificação clínica
  real (o arquivo bruto salvo por `storePatientDocument` ali sempre entra como `OTHER`).

`npx tsc --noEmit` e `npx next build` limpos (nenhum erro novo — os 2 erros pré-existentes de
`FormData` nesse mesmo arquivo, confirmados via `git stash`, não são desta tarefa).

## QA

QA (agente qa-tester): aprovado com ressalvas — todos os critérios de aceite passaram (função
pura + chamadas reais de IA/Europe PMC), reabertura automática (Decisão 0) 100% validada incluindo
rajada e cross-tenant. Duas ressalvas: (1) VPS do Docling inacessível do ambiente de QA, impedindo
validar o caminho de sucesso real da extração (resiliência à falha, sim, validada) — pendência de
infraestrutura, não de código, fica registrada pro Bruno confirmar o status do serviço; (2) a query
de busca gerada a partir do achado de exame truncava em 120 caracteres no meio de uma palavra,
prejudicando o match no Europe PMC — **corrigido**: `buildQueries` agora usa a primeira frase do
achado (que já é um resumo de 1-2 frases) e só cai pra corte por fronteira de palavra se ainda
assim ficar longo. `qa/report-t-1.md`.

## Code review

3 achados reais, 2 corrigidos, 1 aceito como limitação documentada:
1. **`add_manual_document` (rota `app/api/admin/patients/[id]/route.ts`) criava `PatientDocument`
   direto via Prisma, sem passar por `storePatientDocument` nem chamar `notifyNewClinicalDocument`**
   — esse caminho (usado de verdade pelo botão de importar documento "Atlas" e pelo formulário
   manual de histórico) nunca reabria o relatório, quebrando a garantia da Decisão 0 pra esse
   caminho específico. **Corrigido**: chamada a `notifyNewClinicalDocument` adicionada logo após o
   `create`. Confirmado por busca que agora os 4 pontos de criação de `PatientDocument` no código
   inteiro (`storePatientDocument`, os 2 do AI Import, e este) estão todos cobertos.
2. **`aiSummary` cacheado como string vazia (`""`) era tratado como cache-miss** (`if (!summary)`)
   — um documento sem achado clínico real (a IA corretamente retornando `""`, conforme o próprio
   prompt permite) era re-resumido pela IA em TODA geração futura daquele relatório, pra sempre,
   quebrando a garantia de cache do docstring. **Corrigido**: check trocado pra
   `summary == null` (distingue "nunca computado" de "computado, sem achado").
3. **Corrida real, não corrigida, aceita como limitação documentada**: duas chamadas concorrentes
   de `notifyNewClinicalDocument` pro mesmo paciente sem relatório ainda podem ambas ver
   `latest === null` e criar duas linhas `GENERATING` (sem constraint única, sem transação no
   read+create). Mesma classe de corrida já aceita no enqueue pré-existente de
   `app/api/medical-screening/route.ts` — cenário raro (dois uploads quase simultâneos antes de
   qualquer relatório existir), sem corrupção de dado (só uma geração duplicada, custo, não
   correção), consistente com o padrão de risco já tolerado no resto do projeto. Corrigir de
   verdade exigiria uma constraint de banco ou transação serializada, desproporcional ao risco real.

`npx tsc --noEmit`/`npx next build` limpos após as correções.

## Critérios de aceite
- [ ] Paciente sem relatório ainda: subir um documento clinicamente relevante cria um relatório
      novo (`GENERATING`), sem precisar de triagem completa primeiro (se a triagem também não
      existir ainda, o relatório fica pendente até ela existir, mesmo comportamento de "self-heal"
      já usado hoje).
- [ ] Paciente com relatório `DRAFT`/`UNDER_REVIEW`: subir um documento novo marca o MESMO
      relatório pra reprocessar — não cria uma linha nova.
- [ ] Paciente com relatório `APPROVED`: subir um documento novo cria uma VERSÃO NOVA, a aprovada
      permanece intacta e visível no histórico.
- [ ] Vários documentos subidos em sequência rápida não disparam uma regeneração cara por
      documento — só uma, na próxima vez que o job processar.
- [ ] Documento não-clínico (`INSURANCE`, `CONSENT_FORM`) nunca dispara reabertura nem entra na
      análise.
- [ ] Documento com `extractedText` já preenchido não é re-extraído à toa numa nova geração.
- [ ] Falha do Docling num documento específico não impede o relatório de ser gerado com o resto
      (triagem + outros documentos que funcionaram).
- [ ] Toda sugestão que menciona um achado de exame ainda cita um `sourceRef` de uma busca real —
      nunca aparece como afirmação solta sem evidência por trás.
- [ ] Isolamento cross-tenant: só documentos do próprio paciente/clínica entram na análise ou
      disparam reabertura.
