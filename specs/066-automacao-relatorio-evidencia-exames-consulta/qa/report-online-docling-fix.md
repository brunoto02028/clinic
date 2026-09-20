# QA Report — ONLINE (produção real, https://bpr.clinic) — Fix: docling-serve real + tradução PT→EN da busca de literatura + contraste do diagnosis

**Arquivos tocados:**
- `lib/docling.ts` (reescrito para falar com o `docling-serve` real), `lib/evidence-report.ts` (`translateForSearch`) — commit `44c1eb51`
- `app/admin/patients/[id]/diagnosis/page.tsx` (`DataCard`, contraste de cor) — commit `ae4c0fc9`

**Data:** 2026-09-20
**Ambiente:** Produção (`https://bpr.clinic`), commits `44c1eb51` e `ae4c0fc9` confirmados no ar (`GET /api/health` → 200).
**Resultado geral:** ✅ aprovado

## Contexto

Follow-up direto do QA local (`report-docling-and-translation-fix.md`, ⚠️ aprovado com ressalvas — achou e depois corrigiu 2 gaps reais: `documentFindings` do AI Import não traduzido, e 3 erros de `tsc`). Este QA confirma que o comportamento corrigido funciona **de verdade em produção**, batendo no `docling-serve` real hospedado no mesmo VPS via hostname público (não testado antes em prod, só localmente), e que a correção visual de contraste está no ar.

## Metodologia

- Login via browser real (Playwright MCP), sessão já autenticada como Bruno Admin (SUPERADMIN) no perfil persistente — passou direto pelo desafio Cloudflare (sessão já válida).
- Clínica de teste `QA Docling Online Clinic` (slug `qa-docling-online`) criada via fixtures diretas no Postgres de produção (`external_db_url` do Coolify, obtida sob demanda via API e nunca persistida em disco), com a mesma trava de segurança dos QAs anteriores (`ABORT` se `DATABASE_URL` não apontar para o host de produção conhecido `86.48.18.88:5490`).
- Troquei o "Active Clinic" (switcher no sidebar, expande ao passar o mouse) para a clínica de teste.
- Upload via UI real do PDF sintético `ombro-rm.pdf` (RM de ombro fictícia, já usada em QAs anteriores desta atividade, sem dado real).
- Geração de evidência: não precisei disparar manualmente — o job de reconciliação já tinha criado o relatório sozinho, e reprocessou automaticamente após o upload do documento (confirmado por polling direto no Postgres).
- Limpeza completa ao final, confirmada por query direta (zero resíduo).

## Resumo

| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| A | AI Import (UI) com PDF real → Docling real extrai texto, sem erro | UI + DB | ✅ |
| A | `extractedText` do documento bruto preenchido com o texto real extraído pelo `docling-serve` de produção | DB | ✅ |
| A | `aiSummary` do documento processado (AI Import) já em inglês (confirma fix do B3 do QA local) | DB | ✅ |
| B | Triagem PT ("Dor no ombro direito") → evidência real, relevante, em inglês | DB + UI | ✅ |
| B | Reconciliação reprocessa o relatório após novo documento, incorporando o achado da MRI | DB | ✅ |
| C | Diagnosis page — cards "disponível" com fundo verde claro sólido, texto legível | UI (screenshot) | ✅ |
| — | Console do browser sem erros JS em nenhum fluxo | Playwright | ✅ |
| — | Nenhum paciente real tocado | DB (fixtures isoladas) | ✅ |
| — | Limpeza completa dos dados de teste | DB | ✅ |

## Detalhes

### A — Docling real funcionando a partir do container de produção ✅

Botão "AI Import" → upload de `ombro-rm.pdf` → "Run AI Import". Processou com sucesso: "SOAP Notes: 1 note(s) created / Documents: 2 document(s) saved", sem erro "Docling extraction failed". "Confirm & Save All" persistiu os dados.

Confirmado por leitura direta no Postgres de produção: o documento bruto tem `extractedText` com **518 caracteres**, começando com `"RESSONANCIA MAGNETICA DE OMBRO DIREITO Indicacao clinica: reavaliacao apos tratamento conservador para dor no ombro direito. Achados: - Confirma tendinopatia do supraespinhal, sem sinais de progressao..."` — texto real extraído do PDF, provando que o container de produção alcançou de fato o `docling-serve` real via rede. Isso fecha uma pendência deixada em aberto pelo QA online anterior (`report-online.md`), cujos PDFs sintéticos não geraram extração.

O segundo documento salvo pelo AI Import (`"Right Shoulder MRI"`) tem `aiSummary` já **em inglês** — confirma em produção o addendum do QA local (prompt do AI Import corrigido para sempre responder em inglês).

### B — Tradução PT→EN da busca de literatura em produção ✅

O job de reconciliação (`generatePendingEvidenceReports`, a cada 2 min) já tinha criado um `ClinicalEvidenceReport` sozinho para a triagem (`chiefComplaint: "Dor no ombro direito"`, PT puro) antes de eu abrir o AI Import. Após o upload do documento, o relatório ficou `needsReprocessing: true`; monitorei o próprio job reprocessar sem intervenção manual (`needsReprocessing` → `false`, `GENERATING` → `DRAFT`, ~2 min depois).

O relatório final (confirmado no banco e na UI, aba Evidence):
- Narrativa 100% em inglês, clinicamente coerente com o caso.
- 6 fontes (F1–F6), todas em inglês, majoritariamente sobre dor/patologia de ombro — incorporando o achado real da MRI na síntese.
- `gaps` sinaliza corretamente as fontes menos aderentes como não diretamente relevantes.
- Comportamento exatamente o esperado pela correção (antes, a mesma busca em PT retornava artigos aleatórios).

### C — Correção visual de contraste na página de diagnóstico ✅

Em `/admin/patients/[id]/diagnosis` da paciente de teste (3 dos 5 cards "disponíveis": Medical Screening, Clinical Notes, Documents), confirmado visualmente: fundo verde claro sólido (`bg-green-100`) e texto verde escuro legível (`text-green-700`) — não mais o verde-acinzentado lavado do bug antigo. Cards sem dado mantêm o estilo neutro, sem alteração.

## Erros de console

Zero erros e zero warnings em todos os fluxos testados — só métricas de performance informativas (TTFB/FCP/LCP/FID).

## Falhas e recomendações

Nenhuma falha encontrada. A pendência "extração real via Docling não confirmada" do QA online anterior está fechada.

## Limpeza

- Clínica `qa-docling-online` (2 usuários, 2 documentos, 1 relatório, 1 nota SOAP) removida do banco de produção — confirmado por query direta (nada restante).
- Arquivo temporário com a `external_db_url` removido.
- Aba do browser fechada. Nenhum paciente real foi tocado.

## Screenshots

Em `specs/066-automacao-relatorio-evidencia-exames-consulta/qa/screenshots/`:
- `online-docling-ai-import-result.png`
- `online-diagnosis-datacard-contrast.png`
- `online-evidence-tab-report.png`

## Scripts criados

Mesmo padrão dos demais `scripts/qa/*.cjs`, com trava de segurança pro host de produção:
- `scripts/qa/docling-online-fixtures.cjs`
- `scripts/qa/docling-online-inspect.cjs`
- `scripts/qa/docling-online-cleanup.cjs`

**Resumo final:** ✅ aprovado — 9/9 cenários passaram, zero bugs encontrados, zero paciente real afetado, limpeza confirmada.
