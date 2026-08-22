# QA Report — T-3: scripts/search_literature.js

**Data:** 2026-08-22 · **Resultado:** APROVADO (5/5) — **testado contra a Europe PMC real**

- **3.1** `node search_literature.js "patellofemoral pain syndrome exercise therapy" 8` → JSON
  com id, source, pmid, doi, url, title, authors, journal, year, language, pubTypes,
  isOpenAccess, evidenceLevel, evidenceRank. Retorno real da API (não mock).
- **3.2** Ordenação por evidência: systematic review/meta-analysis (rank 5) no topo, depois
  RCT (4), narrativa (2), outros (1). Confirmado em 2 queries
  ("patellofemoral…" e "lateral epicondylitis eccentric loading").
- **3.3** Determinístico: classificação por regra fixa sobre pubType+título; mesmo input →
  mesma saída.
- **3.4** Erro tratado: sem query → stderr + **exit 2**; falha de rede/HTTP → stderr + exit 1
  (caminho de código verificado).
- **3.5** Query enviada contém só termos clínicos — **nenhuma PII**.
- Correção aplicada no QA: `journal` vinha `null` (campo estava em `journalInfo.journal.title`);
  parsing ajustado e revalidado (revista agora populada: "Complementary therapies in medicine",
  "BMC musculoskeletal disorders", etc.).
