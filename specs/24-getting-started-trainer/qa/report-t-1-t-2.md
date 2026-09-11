# QA T-1 + T-2 — Getting started do trainer

**Data:** 2026-09-11
**Ambiente:** dev local :4224, fixtures 2 tenants. Prod não tocada.
**Resultado:** ✅ **APROVADO**

## Evidência (Playwright)
### T-1 — card "Getting started" (trainer `qa.trainer`, tenant personal)
- No `/admin` aparece o card **"Getting started"** com os 5 passos (Personalise your studio · Invite your first student · Build a workout · Record an assessment · Track progress) + link **"Full guide →"** para `/admin/studio-guide`.
- **Detecção**: "Invite your first student" aparece **concluído** e o rodapé mostra **"1 of 5 done"** (fixture tem 3 alunos → `studentCount>0`).
- **Dismiss**: clicar em Dismiss remove o card; após **reload** continua sumido (localStorage) → 0 ocorrências.
- **Regressão**: admin de clínica (`qa.admina`) **não** vê o card (nem os studio links).

### T-2 — página `/admin/studio-guide`
- Abre com "How it works", "Back to dashboard" e os 5 passos expandidos (o quê + por quê + CTA para a tela). O link "Full guide →" do card leva até ela.

## tsc
- Sem erros novos.

## Notas
- Sem API nova; contagem vem do `stats.totalPatients` já carregado no dashboard.
- v1 em texto + ícones; GIFs/prints podem entrar depois.

**Conclusão: APROVADO.**
