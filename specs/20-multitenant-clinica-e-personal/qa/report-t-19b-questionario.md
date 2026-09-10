# QA T-19b (parte 3) — Estrutura do questionário de prontidão

**Atividade:** specs/20-multitenant-clinica-e-personal
**Tarefa:** T-19b — sub-parte "estrutura do questionário de prontidão"
**Data:** 2026-09-10
**Resultado:** ✅ **APROVADO** (10/10 testes)

> **Estrutura, não conteúdo.** As perguntas e critérios de encaminhamento são autorais e revisados pelo **painel clínico** (decisão do Bruno: "eu forneço o conteúdo depois"). O rascunho embutido é placeholder com `panelApproved: false`; a tela exibe um banner de prévia para nunca ser confundida com triagem médica real.

## Entregue
- `lib/readiness-questionnaire.ts` — schema (`ReadinessQuestionnaire`, `ReadinessQuestion`, `Bilingual`), rascunho placeholder (`READINESS_QUESTIONNAIRE_DRAFT`, `panelApproved:false`) e `evaluateReadiness()` **fail-closed** (pergunta não respondida nunca libera).
- `components/readiness/readiness-questionnaire.tsx` — tela bilíngue (EN/PT): intro, perguntas Sim/Não, banner de prévia enquanto não aprovado, e o veredito (liberado / encaminhamento / incompleto).
- Não está plugada em nenhuma rota ainda — entra no onboarding do personal (T-19 passo 1), que depende de T-17. Pronta para ligar o conteúdo do painel.

## Evidência — jest (`__tests__/personal/readiness.test.tsx`, 10/10)
- `evaluateReadiness`: libera com tudo respondido e sem flag; sinaliza resposta de encaminhamento; **falha fechado** em pergunta faltante; rascunho `panelApproved:false`.
- Tela: banner de prévia enquanto não aprovado; prompts em PT com `isPt`; encaminhamento chama `onComplete(cleared:false)`; mensagem de liberação; **estado incompleto** mostra aviso neutro (não a mensagem médica) e não chama `onComplete`; mudar resposta **limpa** o veredito anterior (sem fail-open).

## Respostas ao code review (5 achados, todos endereçados)
| # | Achado | Disposição |
|---|--------|-----------|
| 1 | Veredito obsoleto persistia após mudar resposta (fail-open) | ✅ Corrigido — mudar qualquer resposta limpa o resultado e reexibe o botão. Teste dedicado. |
| 5 | Controles editáveis mas inertes após submit | ✅ Corrigido pelo mesmo mecanismo (mudança recalcula/reexibe submit). |
| 2 | Form incompleto mostrava a mensagem médica de encaminhamento | ✅ Corrigido — estado "incompleto" com aviso neutro "responda todas as perguntas"; `onComplete` só dispara quando completo. Teste dedicado. |
| 3 | (catálogo) flash da lista físio no personal durante load | ✅ Corrigido em report-t-19b-catalogo.md. |
| 4 | Tipo `Bilingual` duplicado inline | ✅ Corrigido — importado de `lib/readiness-questionnaire`. |

**Conclusão: APROVADO** (estrutura). Conteúdo clínico pendente do painel.
