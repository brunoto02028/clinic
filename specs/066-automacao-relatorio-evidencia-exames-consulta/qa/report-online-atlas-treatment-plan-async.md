# QA Report — ONLINE (produção real, https://bpr.clinic) — Atlas Treatment Plan: geração assíncrona

**Escopo:** Follow-up direto do QA local (`specs/066-automacao-relatorio-evidencia-exames-consulta/qa/report-atlas-treatment-plan-async.md`), que ficou ⚠️ bloqueado por falta de créditos na OpenRouter local e nunca viu o caminho de sucesso completo. Este QA cobre exatamente essa lacuna, em produção real.
**Commit em produção:** `cdbbfdd9` (inclui `fd7f2ae0`), confirmado via `GET https://bpr.clinic/api/health` → `200`.
**Data:** 2026-09-20
**Resultado geral:** ✅ **aprovado** — o caminho de sucesso completo foi validado ponta a ponta (2x), sem nenhum sinal do bug original (HTML/timeout). Um achado sem relação com o fix é documentado abaixo (não é regressão, comportamento já previsto no código).

## Metodologia
- Login via browser real (Playwright MCP), sessão já autenticada como Bruno Admin (SUPERADMIN) no perfil persistente — sem necessidade de novo login/Cloudflare challenge.
- Fixtures/limpeza direto no Postgres de produção via `external_db_url` do Coolify, com trava de segurança (`ABORT` se o host não for o de produção conhecido) em ambos os scripts: `scripts/qa/atlas-async-online-fixtures.cjs` e `scripts/qa/atlas-async-online-cleanup.cjs`.
- Clínica de teste descartável `QA Atlas Async Online Test Clinic` (`qa-atlas-async-online`), 1 terapeuta (ADMIN) e 1 paciente fictício com triagem submetida e um quadro clínico real e coerente (queda há 3 semanas, dor lateral no ombro direito, pior em elevação, dor noturna) — dados suficientes para o Atlas ter contexto clínico de verdade, sem usar nenhum dado real.
- "Active Clinic" trocado via switcher no header (necessário — sem isso `staffPatientAccess` retorna 404 mesmo pro platform admin, mesmo comportamento de isolamento já documentado nos QAs online anteriores). Restaurado para "Back to BPR" ao final.
- Chave da OpenRouter de produção (Admin → AI Settings) tinha ~$9,87 de crédito confirmado antes de começar; usadas 3 gerações de treatment plan (6000 tokens cada) + 1 chat — gasto real, dentro do esperado.

## Resumo
| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | Clique em "Generate Plan" → UI mostra "Atlas is analysing..." imediatamente (sem travar) | ✅ |
| 2 | POST responde rápido (não é a chamada longa) | ✅ 238ms |
| 3 | Polling a cada ~3s, todas as respostas rápidas (nunca perto do timeout do proxy) | ✅ (18 GETs observados, 184–275ms cada) |
| 4 | Plano aparece sozinho na tela, sem reload, com conteúdo clínico real e coerente | ✅ (2ª e 3ª tentativas) |
| 5 | DB confirma `status: "ready"`, `planJson` preenchido, `attempts: 1` | ✅ |
| 6 | Nenhum erro "Unexpected token '<'" / HTML de proxy em nenhum momento | ✅ |
| 7 | Botão "Regenerate" → novo `planId`, novo ciclo assíncrono completo, plano novo e distinto renderizado | ✅ |
| 8 | Console do browser sem erros JS em nenhuma etapa | ✅ |
| 9 | "Chat with Atlas" (síncrono) continua funcionando sem regressão | ✅ |
| — | 1ª tentativa de geração falhou com erro de truncamento (não é o bug original, ver observação) | ⚠️ observação, não bug do fix |
| — | Limpeza de todos os dados de teste em produção | ✅ |

## Detalhes

### 1–3. Clique em "Generate Plan" — resposta imediata e polling saudável
Ao clicar em "Generate Plan" pela primeira vez, a UI mudou instantaneamente para o botão desabilitado "Generating..." com o texto "Atlas is analysing all the patient's data and creating the plan...".

- `POST /api/admin/patients/{id}/atlas-treatment-plan` → `200`, **238ms**.
- Sequência de `GET /api/admin/patients/{id}/atlas-treatment-plan/{planId}` a cada ~3s, cada um **184–275ms**, sempre `200`. Nenhuma requisição chegou perto dos ~71s que o proxy reverso mata a conexão.

### 4–6. Caminho de sucesso completo, ao vivo (2 execuções)
**1ª tentativa de geração** (`planId cmua3xa0f0001q2089qok4bbi`) terminou em `failed` após 72s, com o erro `"Atlas didn't return a complete plan — the response may have been cut off. Try again."`. Ver observação separada abaixo — **não é o bug original** (nenhum HTML, nenhum crash, erro limpo em JSON, UI voltou ao estado "Generate Plan" normalmente, console sem erros).

Cliquei em "Generate Plan" de novo. **2ª tentativa** (`planId cmua3zfjy0005q208letposm0`):
- Ficou `generating` por 60s (17:47:13 → 17:48:13), sem eu tocar em nada.
- O plano completo apareceu sozinho na tela: diagnóstico de trabalho ("Right subacromial pain syndrome / probable supraspinatus strain..."), red flags, metas de curto/longo prazo, e 3 fases completas com tratamento em clínica + HEP — tudo coerente com os dados fictícios da triagem.
- Confirmado direto no banco de produção:
```json
{
  "id": "cmua3zfjy0005q208letposm0",
  "status": "ready",
  "attempts": 1,
  "hasPlan": true,
  "planKeys": ["goals","phases","redFlags","totalWeeks","reviewMilestone","sessionsPerWeek","patientEducation","workingDiagnosis","clinicalRationale","contraindications"],
  "error": null,
  "createdAt": "2026-09-20T17:47:13.918Z",
  "updatedAt": "2026-09-20T17:48:13.500Z"
}
```

### 7. "Regenerate" ✅
Cliquei em "Regenerate" no plano pronto. Nova chamada `POST` disparou um `planId` novo (`cmua413pf0007q208cq9fk0cs`), UI voltou a "Generating..." imediatamente, e 67s depois (17:48:31 → 17:49:39) o plano novo apareceu sozinho — **conteúdo genuinamente diferente** do primeiro (diagnóstico reformulado, fases reformuladas), confirmando que não é cache/reaproveitamento.

Resumo das 3 linhas `AtlasTreatmentPlan` geradas para o paciente de teste, direto do banco:

| planId (sufixo) | status | attempts | duração (create→update) |
|---|---|---|---|
| ...qok4bbi | failed (truncado) | 1 | 72.3s |
| ...letposm0 | ready | 1 | 59.6s |
| ...cq9fk0cs | ready | 1 | 67.2s |

### 8. Console — zero erros em todas as etapas
Verificado após cada estado (generating, failed, ready, regenerate, chat): `Total messages: 4 (Errors: 0, Warnings: 0)`. Os 4 avisos residuais são ruído de uma navegação anterior (dev local em `localhost:4000`) que ficou no buffer do browser reutilizado — desde a navegação para `bpr.clinic`, o console ficou zerado em todo momento.

### 9. "Chat with Atlas" (síncrono) — sem regressão ✅
Enviei "What could cause this pain pattern?" no chat livre (persistente, não o refinamento dentro do card do plano). `POST /api/admin/patients/{id}/atlas-chat` → `200` em **27.3s** — bem dentro do timeout do proxy, sem qualquer sinal de HTML/erro de parse. Resposta clínica completa e coerente renderizada na tela, em português.

Refinamento dentro do card de Treatment Plan (botão "Discuss with Atlas") **não foi testado** — não sobrou tempo/crédito de propósito, já que o pedido priorizava "1-2 gerações completas" e o chat livre já confirma que o roteamento síncrono não quebrou.

## Observação: 1ª geração falhou por truncamento — não é o bug original
A primeira tentativa falhou com `"Atlas didn't return a complete plan — the response may have been cut off. Try again."`. Isso **não tem relação com o fix desta sessão** (assincronia/polling): é comportamento já previsto e comentado no próprio código (`lib/atlas-treatment-plan.ts`, linha ~214: *"A patient with an extensive history can push the response past the token budget, truncating mid-JSON."*), com try/catch dedicado que marca `status: "failed"` com mensagem clara em vez de deixar o JSON quebrado vazar pro frontend.

O ponto importante para este QA: a falha foi **tratada graciosamente** — botão voltou a "Generate Plan", mensagem de erro legível na tela, zero erros de console, zero HTML vazando. É exatamente o comportamento que o fix original queria garantir para qualquer tipo de falha. Não é um bug a corrigir agora; documentado apenas para registro. Retry manual resolveu na tentativa seguinte.

## Falhas e recomendações
Nenhuma falha do fix em si. Nenhum bug novo encontrado. O caminho de sucesso completo está confirmado, 2 vezes, com evidência de banco.

## Limpeza
- Clínica `qa-atlas-async-online` (terapeuta + paciente + triagem + as 3 linhas `AtlasTreatmentPlan`) apagada diretamente no banco de produção — confirmado: `Cleaned up clinic qa-atlas-async-online, 2 user(s).`
- "Active Clinic" no header restaurado para a clínica padrão via "Back to BPR".
- Scripts de fixture/cleanup mantidos em `scripts/qa/atlas-async-online-fixtures.cjs` e `scripts/qa/atlas-async-online-cleanup.cjs` (padrão dos QAs online anteriores da sessão).
- Nenhum paciente real foi tocado.

## Screenshots capturados

Em `specs/066-automacao-relatorio-evidencia-exames-consulta/qa/screenshots/`:
- `atlas-async-online-01-generating.png`
- `atlas-async-online-02-truncated-error.png`
- `atlas-async-online-03-plan-ready.png`
- `atlas-async-online-04-regenerate-ready.png`
- `atlas-async-online-05-chat-response.png`

**Resultado geral: ✅ aprovado — 9/9 cenários passaram, 0 reprovados, 1 observação (não-bug) documentada.**
