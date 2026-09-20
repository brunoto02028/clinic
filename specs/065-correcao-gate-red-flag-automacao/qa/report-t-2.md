# QA Report — T-2: Tradução completa do relatório ao trocar pra PT

**Data:** 2026-09-20
**Resultado geral:** ⚠️ aprovado com ressalvas — lógica correta e validada, mas **o código de T-2 ainda não estava commitado nem em produção** no momento do QA; produção continuava rodando o código anterior (só narrativa, tradução manual). Isso mudou o plano de teste no meio da execução — ver "Achado crítico de ambiente" abaixo. **Corrigido pela sessão principal logo em seguida: commit + deploy feitos após este QA.**

## Achado crítico de ambiente (leia antes do resto)

O prompt de QA pedia para testar contra produção usando 5 pacientes reais (Ana Livia, Gabby Boss, Eduardo Nogueira, Daniel To, Mione). Ao trocar o toggle para PT no relatório da Ana Livia em produção, nada além dos rótulos da UI traduziu — exatamente o bug original que T-2 deveria corrigir. Investigando, a causa real: os três arquivos de T-2 estavam modificados no working tree local, nunca commitados — produção estava rodando o deploy do commit `8fd30c34` (só T-1). Confirmado batendo direto na API de produção: `POST .../evidence-report {action:"translate"}` no relatório real da Ana Livia retornou só `{id, narrativeEn, narrativePt}`, nunca `suggestionsPt`/`gapsPt` — as colunas existiam no banco (o `prisma db push` já tinha sido aplicado), mas ficaram `NULL` porque a rota publicada era a versão antiga.

Não deixou nada quebrado em produção: a chamada manual de tradução que rodou no relatório real da Ana Livia preencheu `narrativePt` com uma tradução legítima (usando o código antigo, também correto para esse campo) — conteúdo real, permanece.

## Pivô de metodologia

Com produção fora de alcance para validar o código novo, o QA migrou pro ambiente local (`next dev -p 4555`, fixtures dedicadas em `bpr_clinic_local`, 2 clínicas/3 pacientes-relatórios), testando a rota real via `curl` com cookie de sessão mintado, mais um teste jest temporário (removido depois) pro cenário de contagem divergente. O clique real do toggle no navegador não foi testado (navegador Playwright compartilhado com outro agente concorrente nesta sessão, cookie de sessão `next-auth` httpOnly já ativo de outra identidade — evitou derrubar a sessão do outro agente) — validado por leitura de código + confirmação de que a API que o `useEffect` chama funciona como esperado.

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | Traduzir tudo numa chamada (resumo+sugestões+lacunas) | API real (local) | ✅ |
| 2 | EN mostra conteúdo original, nunca sobrescrito | API real (local) | ✅ |
| 3 | Idempotente — EN→PT→EN→PT não refaz chamada de IA | API real (local) | ✅ |
| 4 | Relatório red-flag nunca dispara tradução | API real + leitura de código | ✅ |
| 5 | Contagem de itens divergente → 502, nada gravado | Unit test mockado (jest, removido) | ✅ |
| 6 | Isolamento cross-tenant (patientId e reportId, incl. teste tipo IDOR) | API real (local, 2 clínicas) | ✅ |
| — | Disparo automático via clique no toggle (zero clique) | Leitura de código + API | ⚠️ parcial (sem clique real, ver acima) |
| — | `tsc --noEmit` sem erros novos nos 3 arquivos tocados | Compilador | ✅ |
| — | Sem envio automático ao paciente | Leitura de código (PATCH route, inalterada por T-2) | ✅ |

## Ambiente e método
- Produção (`bpr.clinic`): usada só para constatar o bug/achado de ambiente acima; nenhuma escrita destrutiva.
- Local (`bpr_clinic_local`, `next dev -p 4555`): fixtures em `scripts/qa/t065-t2-fixtures.cjs` (removidas ao final por `scripts/qa/t065-t2-cleanup.cjs`, mantidos os dois scripts).
- Cenário 5: teste jest temporário mockando `@/lib/db`, `@/lib/ai-provider`, `next-auth`, `@/lib/staff-patient-access` — 3/3 testes passaram, arquivo removido depois.
- `npx tsc --noEmit -p .` filtrado: zero erros nos três arquivos tocados por T-2.

## Detalhes

### 1. Traduzir tudo numa chamada só ✅
Fixture local com `narrativeEn`, 2 sugestões de tratamento, 1 de exercício, 2 lacunas em inglês. `POST action:"translate"` → 200, resposta com `narrativePt`, `suggestionsPt` (treatment+exercise traduzidos, `sourceRef`/`available`/`inCatalog` preservados) e `gapsPt` — exatamente como o plano descreve.

### 2. EN mostra conteúdo original, nunca sobrescrito ✅
`narrativeEn`/`suggestions`/`gaps` (inglês) continuam presentes e inalterados ao lado dos campos `*Pt` — a rota nunca escreve nos campos EN, só nos `*Pt`.

### 3. Idempotente ✅
Segunda chamada ao mesmo `reportId` (já totalmente traduzido) respondeu em ~0.17s (contra vários segundos da primeira, que fez chamada real de IA) — early-return "already fully translated", sem nova chamada à IA. `narrativePt`/`suggestionsPt`/`gapsPt` idênticos entre a 1ª e a 2ª resposta.

### 4. Red-flag nunca traduz ✅
Fixture red-flag sem `narrativeEn`/`suggestions`/`gaps`: chamada direta à rota retorna tudo `null`, sem chamar `callAIClinical` (early-return, nenhum campo "need*" fica verdadeiro). No componente, `needsTranslation` tem `!report.redFlag` como primeira condição — nunca dispara o `useEffect` para um relatório red-flag.

### 5. Contagem de itens divergente → 502, nada gravado ✅
Teste jest: resposta da IA com contagem errada (treatment ou gaps) → 502, mensagem "mismatched item count", `prisma.update` nunca chamado. Controle com contagem correta → 200, update chamado uma vez com os dados certos.

### 6. Isolamento cross-tenant ✅
`patientId` de outra clínica → 404 "Patient not found" (bloqueado por `staffPatientAccess` antes da lógica de tradução). `patientId` válido da clínica A combinado com `reportId` de um relatório da clínica B (teste tipo IDOR) → 404 "Report not found" — confirma que o `findFirst` escopa por `patientId`, não só por `reportId`.

### Sem envio automático ao paciente ✅
T-2 não tocou a rota `PATCH` — `allowed` continua sem `SENT_TO_PATIENT`, comentário explícito mantido no código.

## Erros de console
Nenhum novo observado antes do pivô pra teste via API (sem navegador depois disso).

## Falhas e recomendações
Nenhuma falha na lógica de T-2. A única pendência real era de processo/deploy — **corrigida pela sessão principal**: commit + push + deploy feitos logo após este relatório, com uma checagem de regressão rápida em produção (clique real no toggle, sem o conflito de sessão compartilhada que bloqueou esse teste específico neste QA) confirmando o comportamento em produção.

## Artefatos usados
- Mantidos: `scripts/qa/t065-t2-fixtures.cjs`, `scripts/qa/t065-t2-cleanup.cjs`.
- Removidos após uso: teste jest temporário e scripts de diagnóstico únicos.
- Fixtures locais apagadas ao final; servidor `next dev -p 4555` encerrado.
- Nenhuma escrita destrutiva em produção.
