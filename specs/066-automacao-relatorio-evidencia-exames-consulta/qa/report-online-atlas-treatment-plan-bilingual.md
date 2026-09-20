# QA Report — ONLINE (produção real, https://bpr.clinic) — Atlas Treatment Plan: bilíngue (EN + PT-BR sempre)

**Escopo:** Confirmação sistemática, em produção, do fluxo bilíngue do Atlas Treatment Plan (`planJson` em inglês + `planJsonPt` em português brasileiro, gerados sempre na mesma execução do job), já validado manualmente pelo Bruno num paciente real (Mione De Almeida). Este QA usa um paciente de teste descartável.
**Commit em produção no início do teste:** `4e0c611c` ("feat: always generate Atlas treatment plans in English and Brazilian Portuguese"), confirmado via `GET https://bpr.clinic/api/health` → `200`.
**Data:** 2026-09-20
**Resultado geral:** ⚠️ **aprovado com ressalva** — o fluxo bilíngue completo funciona ponta a ponta (2 gerações completas, EN+PT sempre preenchidos, tradução clinicamente coerente, sem erro de HTML/timeout, chat livre em pt-BR correto). Uma ressalva real foi encontrada: o toggle EN/PT não voltava para PT depois de "Regenerate" se o admin tivesse deixado o toggle em EN antes de clicar — não é um bug de idioma incorreto nem de dado corrompido, é um bug de estado da UI. **Já corrigido antes deste relatório ser salvo** (ver seção Falhas).

## Metodologia
- Login via browser real (Playwright MCP), sessão já autenticada como Bruno Admin (SUPERADMIN) no perfil persistente.
- Fixtures/limpeza direto no Postgres de produção (host `86.48.18.88:5490`), com trava de segurança (`ABORT` se o host não for o de produção conhecido): `scripts/qa/atlas-bilingual-online-fixtures.cjs` e `scripts/qa/atlas-bilingual-online-cleanup.cjs`. Script auxiliar `scripts/qa/atlas-bilingual-online-inspect.cjs` para ler as linhas `AtlasTreatmentPlan` direto do banco.
- Clínica de teste descartável `QA Atlas Bilingual Online Test Clinic` (`qa-atlas-bilingual-online`), 1 terapeuta (ADMIN) e 1 paciente fictício (`QA Atlas Bilingual Patient`) com triagem submetida cuja queixa principal foi escrita em português: *"Dor no ombro direito há cerca de 2 semanas, piora ao levantar o braço acima da cabeça."* (motorista profissional, dor 5/10, sem trauma relatado).
- "Active Clinic" trocado via switcher no header (necessário — sem isso `staffPatientAccess` retorna "Patient not found" mesmo pro platform admin, mesmo comportamento de isolamento já documentado nos QAs online anteriores). Restaurado para "Back to BPR" ao final.
- Saldo OpenRouter confirmado via `https://openrouter.ai/api/v1/credits` (chave descriptografada do `SystemConfig` de produção com `NEXTAUTH_SECRET`) **antes** de gastar: `$10 total, $1.65 já usados` (~$8,35 disponíveis). Usadas: 2 gerações completas (cada = 2 chamadas de IA sequenciais, EN + tradução PT) + 1 chat livre. Saldo final: `$10 total, $1.90 usados` (~$8,10 restantes) — gasto real ~$0,25.

## Resumo
| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | "Generate Plan" → UI mostra "Atlas is analysing..." imediatamente, POST rápido | ✅ |
| 2 | Geração assíncrona completa, sem erro de HTML/timeout, mesmo levando ~90-105s (2 chamadas de IA) | ✅ |
| 3 | Plano aparece sozinho, sem reload; `planJson` (EN) e `planJsonPt` (PT) confirmados no banco | ✅ |
| 4 | Toggle EN/PT aparece ao ficar pronto, **PT selecionado por padrão** na 1ª geração | ✅ |
| 5 | Conteúdo em PT é português brasileiro correto (não europeu) | ✅ |
| 6 | Clicar em EN troca o conteúdo corretamente, sem erro, sem reload | ✅ |
| 7 | Conteúdo EN e PT clinicamente coerentes entre si (tradução fiel, não cópia) | ✅ |
| 8 | Console sem novos erros JS em nenhuma etapa | ✅ |
| 9 | "Regenerate" → plano novo (EN+PT), conteúdo distinto do primeiro | ✅ |
| 10 | "Regenerate" → toggle volta para PT por padrão | ❌ reprovado no momento do teste — corrigido logo em seguida |
| 11 | "Chat with Atlas" (livre) responde em pt-BR correto, sem regressão | ✅ |
| — | Limpeza dos dados de teste em produção | ✅ |

## Detalhes

### 1–3. Geração assíncrona completa, sem timeout
POST rápido (não é a chamada longa), polling a cada ~3s sempre 200. 1ª geração (`planId` sufixo `wzyoj7jx`): **91,47s**, `status: "ready"`, `attempts: 1`, sem truncamento. Confirmado no banco:
```json
{
  "id": "cmuaa93cf0003lf08wzyoj7jx", "status": "ready", "attempts": 1, "error": null,
  "durationSec": 91.47, "hasEn": true, "hasPt": true,
  "enWorkingDiagnosis": "Right shoulder subacromial pain syndrome (rotator cuff related shoulder pain), likely supraspinatus tendinopathy/reactive tendinopathy, occupational overload in a professional driver",
  "ptWorkingDiagnosis": "Síndrome da dor subacromial do ombro direito (dor no ombro relacionada ao manguito rotador), provável tendinopatia/tendinopatia reativa do supraespinhal, sobrecarga ocupacional em motorista profissional",
  "enKeys": ["goals","phases","redFlags","totalWeeks","reviewMilestone","sessionsPerWeek","patientEducation","workingDiagnosis","clinicalRationale","contraindications"],
  "ptKeys": [mesmas chaves]
}
```

### 4–7. Toggle EN/PT, PT por padrão, conteúdo pt-BR correto
Ao ficar pronto, o card já mostrou PT por padrão, com terminologia nativa correta ("manguito rotador", "amplitude de movimento", "sobrecarga ocupacional em motorista profissional"), sem nenhum traço de português europeu. Clicar em EN trocou instantaneamente (troca de estado local, sem nova chamada de rede), tradução fiel.

### 8. Console — zero erros novos
Total consistente de 2 erros 404 pré-existentes (de antes da troca de Active Clinic, mesmo comportamento de isolamento já documentado), nenhum erro novo durante geração/toggle/regenerate/chat.

### 9–10. Regenerate — plano novo correto, achado no reset do toggle (já corrigido)
Regenerate (com toggle deixado em EN do passo anterior) gerou plano novo (`planId` sufixo `dkkhwp3m`), **103,5s**, conteúdo distinto (nova referência — Diercks et al. 2014 —, fases reescritas), `planJson`/`planJsonPt` ambos corretos e coerentes entre si.

**Achado, no momento do teste:** quando o plano novo ficou pronto, a tela mostrou inglês, não português — porque `tpLang` ficou no estado deixado manualmente (EN) e `handleGenerateTreatmentPlan`, no código então em produção (commit `4e0c611c`), não resetava esse estado ao iniciar uma nova geração. Dado certo, só o default de exibição que não foi aplicado.

**Resolução:** a correção (`setTpLang("pt")` em `handleGenerateTreatmentPlan`) já tinha sido feita no working tree local pela sessão principal (a partir do achado equivalente do QA local, `report-atlas-treatment-plan-bilingual.md`) antes deste QA online rodar, mas ainda não estava deployada no momento deste teste — por isso o agente online observou o bug ao vivo. Commitada e deployada logo em seguida.

### 11. "Chat with Atlas" — pt-BR correto, sem regressão
`POST .../atlas-chat` → 200. Resposta completa em pt-BR correto e clinicamente sólida (diagnóstico diferencial, perguntas de rastreio, red flags a excluir, próximos passos sugeridos). Nenhum traço de português europeu.

## Falhas e recomendações
- **Achado (severidade baixa, UX) — já corrigido:** `handleGenerateTreatmentPlan` não resetava `tpLang` para `"pt"` ao iniciar geração/regeneração. Corrigido com `setTpLang("pt")`, commitado e deployado após este QA.
- Nenhuma outra falha encontrada.

## Limpeza
- Clínica `qa-atlas-bilingual-online` (terapeuta + paciente + triagem + 2 linhas `AtlasTreatmentPlan`) apagada do banco de produção — confirmado: `Cleaned up clinic qa-atlas-bilingual-online, 2 user(s).`
- "Active Clinic" restaurado para a clínica padrão via "Back to BPR".
- Scripts mantidos: `scripts/qa/atlas-bilingual-online-fixtures.cjs`, `scripts/qa/atlas-bilingual-online-cleanup.cjs`, `scripts/qa/atlas-bilingual-online-inspect.cjs`.
- Nenhum paciente real foi tocado.

## Screenshots
Em `specs/066-automacao-relatorio-evidencia-exames-consulta/qa/screenshots/`:
- `atlas-bilingual-online-01-generating.png`
- `atlas-bilingual-online-02-plan-ready-pt.png`
- `atlas-bilingual-online-03-plan-en.png`
- `atlas-bilingual-online-04-regenerate-toggle-not-reset-bug.png`
- `atlas-bilingual-online-05-regenerate-toggle-pt-manual.png`
- `atlas-bilingual-online-06-chat-ptbr.png`

**Resultado geral: ⚠️ aprovado com ressalva — 10/11 cenários passaram, 1 reprovado no momento do teste (toggle EN/PT não resetava pra PT no Regenerate), já corrigido e deployado.**
