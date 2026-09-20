# QA Report — Fix: `lib/docling.ts` (docling-serve real) + tradução PT→EN da busca de literatura

**Arquivos tocados:** `lib/docling.ts` (reescrito), `lib/evidence-report.ts` (`translateForSearch` + uso em `generateEvidenceReport`)
**Data:** 2026-09-20
**Resultado geral:** ⚠️ aprovado com ressalvas

## Contexto

QA ad-hoc, follow-up direto da atividade 066, motivado por uma simulação/stress-test em produção que achou dois gaps reais: (1) `lib/docling.ts` chamava endpoints que nunca existiram em nenhum serviço real; (2) a busca de literatura no Europe PMC usava texto em português (da triagem), majoritariamente indexado em inglês, trazendo artigos irrelevantes. Sem spec formal aberta — QA ad-hoc.

## Ambiente

- Banco local `bpr_clinic_local`. App rodando via `npx next dev -p 4200` (porta padrão 4000 ocupada por outro projeto não relacionado no mesmo host).
- `DOCLING_API_URL`/`DOCLING_BASIC_AUTH_USER`/`DOCLING_BASIC_AUTH_PASSWORD` já configuradas no `.env` local, apontando pro `docling-serve` real. `curl` direto no serviço confirmou `{"status":"ok"}` (200) antes de qualquer teste — nada foi mockado, os testes abaixo bateram no Docling real.
- Fixtures descartáveis criadas só pra este QA: clínica "QA Docling Fix Clinic", admin `admin.docling.fix.qa@example.test`, paciente `patient.docling.fix.qa@example.test` com triagem `chiefComplaint: "Dor no ombro direito"` / `painLocation: "Ombro direito"`. Scripts em `scripts/qa/docling-translation-fix-*.{cjs,ts}`.
- PDFs de teste reaproveitados de `.playwright-mcp/demo066-uploads/` (fixtures sintéticas de QA anteriores desta atividade, sem dado real).
- Login de UI via `/staff-login` real (não injeção de cookie) para o fluxo "AI Import"; cookie de sessão mintado via `scripts/qa/mint-session-cookie.cjs` para os testes de API via `curl`.

## Resumo

| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| A1 | AI Import (UI) com PDF real → extração via Docling real, sem erro | UI (Playwright) | ✅ |
| A2 | `/admin/documents` Convert (Markdown) com PDF real | UI (Playwright) | ✅ |
| A2b | `/admin/documents` Convert (JSON) via API direta | API | ✅ |
| A3 | `/admin/documents` Extract (Tables) → erro claro, UI não quebra | UI + API | ✅ |
| A3b | `/admin/documents` Analyze (Summary) → erro claro, UI não quebra | UI + API | ✅ |
| A3c | `/admin/documents` OCR → erro claro, UI não quebra | UI + API | ✅ |
| A3d | `extractMetadata`/`extractStructure`/`analyzeKeywords`/`analyzeEntities` → erro claro | API | ✅ |
| A4 | `DOCLING_API_URL` não configurada → erro claro, sem fetch de string vazia | Script isolado | ✅ |
| A5 | Auth: sem sessão em `/api/admin/documents/convert` → bloqueado (middleware) | API | ✅ |
| B1 | `translateForSearch`: triagem PT ("Dor no ombro direito") → evidência real em inglês, relevante ao ombro | Real (IA + Europe PMC) | ✅ |
| B2 | Fallback do `translateForSearch` se a tradução falhar (não trava o relatório) | Inspeção de código | ✅ ⚠️ não executado ao vivo |
| B3 | `documentFindings` sempre em inglês (premissa do comentário do diff) | Real (achado de bug) | ❌ |
| — | `npx tsc --noEmit -p .` (filtrado) — erros novos nos arquivos desta correção | Build | ❌ (3 erros novos, não-bloqueantes em runtime) |
| — | `npm run build` "limpo" — checado o motivo | Inspeção de código | ⚠️ ver observação |

## Detalhes

### A1 — AI Import (UI) com PDF real ✅
Login real via `/staff-login` como admin da clínica de QA. Na ficha do paciente, botão "AI Import" → upload de `ombro-rm.pdf` (PDF sintético de RM de ombro, sem dado real) → "Run AI Import". Processou com sucesso (Docling real + IA): "Screening: 0 conditions... / SOAP Notes: 1 note(s) created / Documents: 2 document(s) saved". Sem erro de console (0 erros JS). Confirmado no banco: `extractedText` do documento bruto preenchido corretamente com o texto extraído do PDF.
Screenshot: `screenshots/docling-ai-import-success.png`.

### A2 — `/admin/documents` Convert (Markdown) ✅
UI: upload de `quadril-rx.pdf`, ação "Convert", formato "Markdown" → painel "Result" com Copy/Download, sem erro.
Screenshot: `screenshots/docling-documents-convert-ok.png`.

### A2b — Convert via API direta (markdown e json) ✅
```
curl -X POST http://localhost:4200/api/admin/documents/convert \
  -H "Cookie: next-auth.session-token=<jwt>" \
  -F "file=@.playwright-mcp/demo066-uploads/consentimento.pdf;type=application/pdf" \
  -F "format=markdown"
→ HTTP 200
{"content":"TERMO DE CONSENTIMENTO\n\nEu, paciente, autorizo o tratamento fisioterapeutico
proposto pela clinica BPR. Assinatura: ______________________","document":{...,"md_content":"..."}}
```
`format=json` também retornou 200 com `document.json_content` (estrutura `DoclingDocument` real).

### A3/A3b/A3c — Extract(tables)/Analyze(summary)/OCR → erro claro, UI não quebra ✅
Testado via UI (Playwright) e via API. Nos três casos, a UI mostra "Processing Failed" com a mensagem específica — não trava, o resto do formulário continua usável. Via API:
```
POST /api/admin/documents/extract  type=tables    → 500 {"error":"Table extraction is not supported by the current Docling deployment (docling-serve only does document conversion)."}
POST /api/admin/documents/analyze  type=summary   → 500 {"error":"Summary analysis is not supported by the current Docling deployment (docling-serve only does document conversion)."}
POST /api/admin/documents/ocr                     → 500 {"error":"Standalone OCR is not supported by the current Docling deployment (docling-serve only does document conversion)."}
```
Screenshots: `screenshots/docling-documents-extract-tables-error.png`, `screenshots/docling-documents-analyze-summary-error.png`, `screenshots/docling-documents-ocr-error.png`.

**Observação (não-bloqueante):** essas respostas continuam sendo HTTP `500` — o corpo é uma mensagem legível (satisfaz "erro claro, não 500 cru nem timeout"), mas o *status code* em si ainda é 500. Não é regressão (o código antigo também sempre devolvia 500 nesses catches).

### A3d — Demais capacidades não suportadas (API) ✅
`extractMetadata`, `extractStructure`, `analyzeKeywords`, `analyzeEntities` — todos retornaram a mesma mensagem clara e específica.

### A4 — `DOCLING_API_URL` não configurada → erro claro ✅
Script isolado (`scripts/qa/docling-no-url-check.ts`, sobrescreve `process.env` só no próprio processo, não toca o `.env` real):
```
extractText threw: DOCLING_API_URL not configured
convertDocument threw: DOCLING_API_URL not configured
checkHealth threw: DOCLING_API_URL not configured
```

### A5 — Sem sessão → bloqueado ✅
```
curl -X POST http://localhost:4200/api/admin/documents/convert (sem cookie)
→ HTTP 307, Location: /login?callbackUrl=%2Fapi%2Fadmin%2Fdocuments%2Fconvert
```

### B1 — Tradução PT→EN da busca de literatura ✅
Paciente de teste com `chiefComplaint`/`painLocation` = "Dor no ombro direito" / "Ombro direito" (português puro). O relatório de evidência foi gerado automaticamente pelo scheduler em background do próprio dev server (sem intervenção manual) e chegou a `DRAFT` com evidência real, relevante ao caso:

- F1 — *"Effectiveness of micro-exercises for managing neck/shoulder pain in sedentary workers: a systematic review and meta-analysis"* (Scientific Reports, 2026)
- F2 — *"Abnormal Brain Structure and Function in People with Shoulder Pain: A Systematic Review..."* (J Pain Research, 2026)
- F5 — *"...corticosteroid injection combined with mobilization vs. mobilization alone... subacromial impingement syndrome..."* (Frontiers Sports, 2026)
- F6 — *"...Floss-Band Procedure with Additional Active Shoulder Movement to Conventional Physiotherapy in... Chronic Hemiplegic Shoulder Pain..."* (J Clin Med, 2026)

Todas as 6 fontes retornadas são em inglês e majoritariamente sobre dor/patologia de ombro — exatamente o comportamento que a correção pretendia (antes, a mesma busca em português retornava artigos aleatórios). Duas fontes (F3 De Quervain, F4 "text neck") são só parcialmente relevantes, mas o próprio relatório já lista isso em `gaps` corretamente.

### B2 — Fallback se a tradução falhar ⚠️ não executado ao vivo (inspeção de código)
Não simulei falha real de IA (exigiria mockar o provider). Confirmado por leitura: `translateForSearch` envolve `callAIClinical` em `try/catch` e retorna o texto original em caso de erro — nunca propaga exceção. Consistente com o padrão de resiliência já usado no resto do arquivo.

### B3 — `documentFindings` NEM SEMPRE chega em inglês ❌ (achado real)
O comentário no diff assume: *"documentFindings já são gerados em inglês desde antes"* — e por isso `translateForSearch` só é aplicado a `condition`/`region`. Essa premissa vale **só** quando o resumo é gerado dentro de `loadDocumentFindings` (que tem `Respond in English` no prompt). Mas existe um segundo caminho que também popula `PatientDocument.aiSummary`: o **AI Import**, cujo prompt de extração (schema JSON `documents[].content`) **não pede inglês**. Quando `aiSummary` já vem preenchido, `loadDocumentFindings` faz cache-hit e usa o texto como está.

Confirmado ao vivo: o documento `IMAGING` criado pelo AI Import (cenário A1) ficou com `aiSummary` 100% em português ("Exame de reavaliação após tratamento conservador para dor no ombro direito..."), e esse texto foi exatamente o que apareceu em `caseSummary.documentFindings[0]` no relatório real (B1). Como `buildQueries` usa `documentFindings` sem passar por `translateForSearch`, isso reintroduz — por outro caminho — o mesmo bug que esta correção resolveu para `condition`/`region`.

**Impacto observado neste caso:** parece absorvido (as 6 fontes retornadas são todas relevantes/em inglês), provavelmente porque as queries baseadas em `condition` dominaram. Mas o mecanismo do bug está presente e pode se manifestar mais forte em casos onde o achado de exame é o sinal principal.

**Recomendação:** aplicar `translateForSearch` também a cada `documentFindings[i]`, ou forçar o prompt do AI Import a responder em inglês no campo `content`, como `loadDocumentFindings` já faz. Não é regressão desta tarefa — é uma lacuna de cobertura.

### `npx tsc --noEmit -p .` — 3 erros novos ❌ (não-bloqueantes em runtime, mas reais)
```
lib/evidence-report.ts(145,48): error TS2339: Property 'content' does not exist on type '{ text: string; }'.
app/api/admin/patients/[id]/ai-import/route.ts(61,31): error TS2339: Property 'content' does not exist on type '{ text: string; }'.
app/api/admin/patients/[id]/ai-import/route.ts(62,76): error TS2339: Property 'content' does not exist on type '{ text: string; }'.
```
Causa: o `extractText` antigo não tinha tipo de retorno explícito (encadeava em `doclingFetch`, `any` implícito), então `extracted?.text || extracted?.content` nunca era checado. O novo `extractText` tem retorno explícito `Promise<{ text: string }>`, e o TS aponta corretamente que `.content` nunca existiu — sempre `undefined`, caindo no fallback. Não quebra nada em runtime (A1/A2b funcionaram normalmente), mas é código morto exposto pelo rewrite, que valeria limpar (`extracted?.text` sozinho) nos dois arquivos.

**Sobre "já rodei, zero erros novos" / "build também rodou limpo":** confirmado por leitura de `next.config.js` — `typescript: { ignoreBuildErrors: true }`. `npm run build` nunca tipa-checka o projeto, então "build limpo" não é evidência de ausência de erros de tipo; só `tsc --noEmit` pega isso.

## Erros de console (Playwright)
Único erro de console em todo o fluxo de UI: `Failed to load resource: 500` para cada chamada a `/api/admin/documents/{extract,analyze,ocr}` que intencionalmente retorna 500 com mensagem clara (A3/A3b/A3c) — é o navegador logando a resposta de rede, não uma exceção JS não tratada. Nenhum erro de runtime JS em nenhum fluxo testado.

## Falhas e recomendações

1. **❌ B3** — `documentFindings` de documentos processados via AI Import não são traduzidos. Aplicar `translateForSearch` a cada `documentFindings[i]`, ou alinhar o prompt do AI Import para responder em inglês.
2. **❌ tsc** — 3 erros de tipo novos, código morto (`.content` que `extractText` nunca retorna) em `lib/evidence-report.ts:145` e `ai-import/route.ts:61-62`. Remover o fallback morto.
3. **⚠️ Observação** — respostas "não suportado" continuam HTTP 500 (corpo claro, status genérico). Não bloqueante.
4. Nenhuma falha envolve envio automático ao paciente, vazamento cross-tenant, ou quebra de UI.

## Limpeza
Clínica/admin/paciente/triagem/documentos/relatório/notas SOAP de QA removidos do banco local (`scripts/qa/docling-translation-fix-cleanup.cjs`, executado — confirmado: 1 relatório, 2 documentos, 1 SOAP note, 1 triagem, 2 usuários e a clínica removidos). Servidor dev auxiliar (porta 4200) encerrado.

## Addendum — correções pós-QA e code review

Depois deste QA, corrigi os 2 achados reais antes de pedir code review:

1. **B3 (documentFindings não traduzido no caminho do AI Import)**: o prompt de extração em `app/api/admin/patients/[id]/ai-import/route.ts` agora pede explicitamente inglês no campo `documents[].content` (mesmo padrão já usado em `loadDocumentFindings`), com uma regra extra explicando o porquê (alimenta a busca de literatura).
2. **3 erros de `tsc` (código morto `.content`)**: removido o fallback morto em `lib/evidence-report.ts:145` e o `if/else if` equivalente em `ai-import/route.ts` — `extractText` só retorna `.text`, nunca teve `.content`. Confirmado: os 3 erros específicos sumiram do `tsc --noEmit`, sem novos erros introduzidos (resto do output é ruído pré-existente do projeto, incluindo o já conhecido `reconstruir/`).

Rodei um code review dedicado (subagente) sobre o diff final dos 3 arquivos. Achados e resolução:

- **`checkHealth` sem proteção contra corpo não-JSON** (inconsistente com `convertFile`, que já tinha `try/catch` em volta do `res.json()`) — corrigido, mesmo padrão aplicado.
- **`app/admin/documents/page.tsx` mostrando o painel "Result" vazio** — achado real fora do escopo original dos 3 arquivos, mas causado diretamente pela mudança de contrato do `docling.ts`: o componente ainda esperava `result.data.content/.markdown/.text` (formato do serviço fake antigo), mas o novo `docling.ts` retorna `{ content, document, processing_time }` direto (sem wrapper `.data`). Corrigido em `renderResult()` (lê `result?.content || result?.text || result?.document?.md_content`) e no display de `processing_time` (também sem `.data`). **Verificado ao vivo** via Playwright contra o dev server local (não só leitura de código): upload de `consentimento.pdf`, ação "Convert" → painel "Result" agora mostra o markdown convertido real ("TERMO DE CONSENTIMENTO...") e "Processed in 4.11s", zero erros de console. Screenshot: `screenshots/docling-documents-convert-fixed.png`.
- **Nit do reviewer**: ternário no-op em `convertDocument` (`toFormat === "md" ? "md" : toFormat`) simplificado para `` `${toFormat}_content` `` — aproveitado o mesmo ponto pra também propagar `processing_time` da resposta real do docling-serve (que eu tinha descartado no achatamento original).
- **Garantia de inglês só por prompt, sem guardrail determinístico, e `aiSummary` já cacheado em PT não é corrigido retroativamente**: aceito como limitação documentada (mesmo padrão já usado neste arquivo pra outras race conditions de baixo risco) — expliquei o motivo em comentário no código (`generateEvidenceReport`, antes do `buildQueries`): aplicar `translateForSearch` a `documentFindings` arriscaria truncar resumos mais longos que uma frase de busca curta (a função usa `maxTokens: 60`, dimensionado pra `condition`/`region`, não pra resumos de 1-2 frases). Não fiz backfill de `aiSummary` histórico — fora do escopo desta correção pontual.

Após as correções: `npx tsc --noEmit -p .` limpo nos 3 arquivos (mesmo ruído pré-existente de sempre em arquivos não relacionados), `npm run build` com exit code 0.
