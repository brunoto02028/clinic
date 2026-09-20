# QA Report — Atlas Treatment Plan bilíngue (EN + PT-BR sempre)

**Escopo:** commit `4e0c611c` ("feat: always generate Atlas treatment plans in English and Brazilian Portuguese"), ambiente **local** (`bpr_clinic_local`).
**Data:** 2026-09-20
**Resultado geral:** ⚠️ aprovado com ressalvas — achado importante de recuperação de estado (provável artefato do dev-mode local, não confirmado em produção), e 1 geração real completa não pôde ser testada por falta de crédito na chave OpenRouter local.

## Resumo

| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | Geração real ponta a ponta (EN + PT-BR) via UI | UI | ⚠️ não executado — sem crédito na OpenRouter local |
| 2 | Regenerate gera novo plano EN+PT | UI | ⚠️ não executado (depende do cenário 1) |
| 3 | Toggle EN/PT troca o conteúdo exibido sem erro | UI | ✅ (com plano inserido via fixture, já que a geração real falhou) |
| 4 | PT-BR selecionado por padrão ao ficar pronto | UI | ✅ |
| 5 | Estrutura de chaves igual entre `planJson` e `planJsonPt`, conteúdo traduzido (não é cópia) | API/DB | ✅ (validado via API `GET .../atlas-treatment-plan`) |
| 6 | Aviso amarelo de tradução indisponível + fallback para EN quando `planJsonPt` é `null` | Código | ✅ por leitura de código; não visualizado ao vivo |
| 7 | "Share with Patient" usa `treatmentPlanPt` real, não mistura labels PT com conteúdo EN | Código | ✅ por leitura de código |
| 8 | `translatePlanToPortuguese` nunca derruba a geração (try/catch, retorna `null`) | Código | ✅ por leitura de código |
| 9 | Botão desabilita e mostra "Atlas is analysing..." durante geração | UI | ✅ |
| 10 | Erro de geração (ex.: sem créditos) é exibido de forma segura, sem crash, sem erro de console | UI | ✅ |
| 11 | Recuperação de estado ao trocar de aba/paciente e voltar (plano "ready" pré-existente) | UI | ❌ **falhou de forma reproduzível** em navegação fresca; funcionou depois de um Fast Refresh do dev server — ver detalhes |
| 12 | `npx tsc --noEmit -p .` nos arquivos tocados | Build | ✅ zero erros novos |

## Ambiente e limitação conhecida

A chave `OPENROUTER_API_KEY` local está sem saldo (confirmado pelo próprio erro da OpenRouter) — exatamente a limitação já antecipada na tarefa. Isso impediu testar a geração real ponta a ponta (qualidade da tradução pt-BR gerada pela IA, red flags, etc.) localmente. Os cenários que dependem só de UI/lógica de exibição, API e leitura de código foram cobertos inserindo um plano "ready" diretamente no banco (fixture determinística, EN e PT com o mesmo shape mas conteúdo propositalmente diferente) via `scripts/qa/atlas-bilingual-seed-ready-plan.cjs`.

## Detalhes

### 1-2. Geração real ⚠️ não executado
- **Ação:** clique em "Generate Plan" na aba Rehab Agent do paciente fixture (triagem em português: dor lombar crônica).
- **Obtido:** falhou com `OpenRouter API error 402` — tanto na tentativa primária quanto no fallback.
- **Log do servidor:**
```
[atlas-treatment-plan] generation failed for cmua9s2x7000bxz4sofap4f10: OpenRouter API error 402:
{"error":{"message":"This request requires more credits, or fewer max_tokens. You requested up to 9000 tokens,
but can only afford 4719. To increase, visit https://openrouter.ai/settings/credits and add more credits", ...}}
```
- **Evidência:** `specs/066-automacao-relatorio-evidencia-exames-consulta/qa/screenshots/atlas-bilingual-generating.png` (estado "Generating...") e `atlas-bilingual-no-credits.png` (erro exibido de forma segura, sem crash, sem erro de console — cenário 10 ✅).
- Não validei a qualidade real da tradução pt-BR gerada pela IA nesta rodada local (esse aspecto foi validado separadamente ao vivo em produção, pela sessão principal, para a paciente Mione De Almeida — ver addendum abaixo).

### 3-5. Toggle EN/PT e estrutura dos dados ✅
- Inseri diretamente no banco (`scripts/qa/atlas-bilingual-seed-ready-plan.cjs`) um `AtlasTreatmentPlan` com `status: "ready"`, `planJson` (EN) e `planJsonPt` (PT-BR traduzido de propósito, não cópia), mesmo shape de chaves.
- `GET /api/admin/patients/:id/atlas-treatment-plan` devolveu os dois campos corretamente (validado via `curl` com cookie de sessão mintado por `scripts/qa/mint-session-cookie.cjs`).
- Na UI: card renderizou primeiro em **PT** por padrão ("Dor lombar crônica inespecífica..." — pt-BR correto), toggle EN/PT visível ao lado do botão "Regenerate". Clique em "EN" trocou o conteúdo instantaneamente, sem reload, sem erro de console.
- **Evidência:** `atlas-bilingual-pt-default.png` (PT, padrão) e `atlas-bilingual-en-toggle.png` (após clicar EN).

### 6. Aviso de tradução indisponível — código ✅, não visto ao vivo
- Inseri um segundo plano fixture com `planJsonPt: null` (`--no-pt`).
- Por leitura de código (`app/admin/patients/[id]/page.tsx:2754-2760`): quando `tpLang === "pt" && !treatmentPlanPt`, renderiza o aviso `text-amber-400` "Tradução em português indisponível para este plano — mostrando em inglês." e usa `displayPlan = treatmentPlan` (fallback EN). Lógica correta.
- **Não confirmei visualmente**: esse segundo plano esbarrou no mesmo problema de recuperação de estado do item 11, então não vi o aviso renderizado ao vivo — cobertura só por leitura de código.

### 7-8. Share with Patient e resiliência da tradução — código ✅
- `handleShareTreatmentPlan`: `const sharePlan = treatmentPlanPt || treatmentPlan;` e monta todo o texto (diagnóstico, objetivos, fases, educação do paciente) a partir de `sharePlan` — corrige de fato o bug pré-existente (antes misturava labels PT com conteúdo em inglês). Fallback para EN só quando `treatmentPlanPt` é `null`.
- `translatePlanToPortuguese` (`lib/atlas-treatment-plan.ts`): try/catch completo, retorna `null` no catch. `generateAtlasTreatmentPlan` salva `status: "ready"` com `planJsonPt: planPt` (pode ser `null`) — falha de tradução nunca muda o status para `failed`.

### 9-10. Botão desabilitado durante geração / erro seguro ✅
- Durante geração: botão "Generating..." (`disabled`) + "Atlas is analysing all the patient's data and creating the plan..." com spinner.
- Ao falhar: erro em vermelho legível, botão volta a "Generate Plan" habilitado, zero erros no console do browser.

### 11. Recuperação de estado ao trocar de aba/paciente ❌ (achado, provável artefato de dev local)

Com um `AtlasTreatmentPlan` já `status: "ready"` no banco (confirmado íntegro via `curl` direto no endpoint), o esperado é que o `useEffect` de recuperação (já existente desde o commit `b38ff67a`, pré-aprovado em `report-online-atlas-treatment-plan-async.md`) restaure a UI ao montar a aba Rehab Agent.

**Observado, de forma reproduzível no ambiente local:**
- Navegação completa nova → clique em "Rehab Agent" → UI mostra "Generate Plan" como se não houvesse plano.
- Confirmado via monkey-patch de `window.fetch` que `GET /api/admin/patients/:id/atlas-treatment-plan` (sem `planId`) nunca é disparada nesses casos.
- **Uma única vez**, logo após um Fast Refresh do Next dev server (disparado por uma edição temporária de diagnóstico, depois revertida), o efeito passou a disparar corretamente e a UI recuperou o plano.

**Addendum da sessão principal:** este mesmo efeito de recuperação já foi observado funcionando corretamente **em produção** anteriormente nesta sessão (após o deploy do commit `b38ff67a`, ao recarregar a ficha da Mione e clicar em "Rehab Agent", o banner de erro recuperado apareceu automaticamente, sem precisar clicar em nada) — e este projeto já tem um padrão catalogado de bugs de cache/HMR específicos do Next.js em modo dev local (não presentes em produção, que roda `next start` sem Fast Refresh). A hipótese mais provável é um artefato do ambiente de dev local deste QA especificamente, não um bug real de produção — mas foi solicitado um QA online em paralelo para confirmar isso de forma independente.

### 12. `npx tsc --noEmit -p .` ✅
Filtrado `^reconstruir/`. Erros pré-existentes no projeto (fora de escopo), zero relacionados a `atlas-treatment-plan`, `patients/[id]/page.tsx` ou qualquer arquivo tocado por este commit.

## Erros de console
Nenhum, em nenhum dos fluxos testados.

## Falhas e recomendações

1. **[Achado principal — ver addendum]** Recuperação de estado do plano "ready" não disparou a busca de recuperação em navegação HTTP normal local, de forma reproduzível. Provável artefato de dev local (já visto funcionando em produção); confirmado via QA online em paralelo.
2. **[Corrigido]** `tpLang` nunca era resetado para `"pt"` ao clicar "Regenerate" — um terapeuta em EN que regenerasse o plano continuava vendo EN em vez de voltar ao padrão PT. Corrigido: `handleGenerateTreatmentPlan` agora chama `setTpLang("pt")`.
3. **[Sem geração real testada localmente]** Qualidade real da tradução pt-BR pela IA não validada nesta rodada local por falta de crédito — validada separadamente em produção pela sessão principal (paciente Mione).

## Arquivos criados para este QA
- `scripts/qa/atlas-bilingual-fixtures.cjs`, `scripts/qa/atlas-bilingual-seed-ready-plan.cjs`, `scripts/qa/atlas-bilingual-cleanup.cjs`.
- Dados de teste (clínica `qa-atlas-bilingual` e usuários associados) removidos do banco local ao final.
- Screenshots em `specs/066-automacao-relatorio-evidencia-exames-consulta/qa/screenshots/atlas-bilingual-*.png`.
