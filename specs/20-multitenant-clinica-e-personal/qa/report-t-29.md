# QA T-29 — Esconder tudo que é clínico do tenant personal

**Atividade:** specs/20-multitenant-clinica-e-personal
**Tarefa:** T-29
**Data:** 2026-09-10
**Ambiente:** local (dev :4202/:4203, banco `bpr_clinic_local`, `OUTBOUND_MODE=sink`). Produção não tocada.
**Resultado:** ✅ **APROVADO** (UI 4/4 + re-QA 2/2 + jest 111 + runtime 43/43)

## O que foi entregue
- **Sidebar:** seção Marketing oculta para personal (`admin-sections`); a seção clínica já era relabelada/gated.
- **Ficha do aluno (personal):** abas Screening, Avaliações, Notas Clínicas, Protocolo, Rehab Agent, Evidência escondidas; botão AI Assessment (topo) escondido; **ações clínicas do Resumo** (SOAP Note, Write History, Gerar/Ver AI Assessment, AI Import) escondidas; Red Flags/Queixa gated. Mantidos: Resumo, Exercícios, Documentos, Mensagens, Workouts + Upload.
- **Safety-net:** `useEffect` força `activeTab` para "resumo" se um personal cair numa aba clínica → o conteúdo clínico nunca monta.
- **URL gate:** `lib/personal-blocked-routes.ts` (renomeado de clinical-routes) bloqueia para personal: módulo clínico (SOAP/protocols/rehab/atlas/soap-notes + geradores por-paciente incl. `ai-import`) **e** marketing (/admin/marketing, /articles, /email*, /education, /sales).

## Evidências
- **jest** `__tests__/tenant/personal-blocked-routes.test.ts` + gating — **111/111** (inclui ai-import, email-templates, sales, e /admin/email-test NÃO bloqueado).
- **runtime** `npm run test:tenants` — **43/43**: G1–G6 (clínico), **G5b** (ai-import→404), **G7/G8** (marketing→redirect), **G9** (clínica não gated).
- **UI (Playwright)** — 4/4 (sidebar sem Marketing; ficha só abas não-clínicas; /admin/marketing redireciona; clínica intacta) — `qa/screenshots/t-29-*.png`.
- **Re-QA (Playwright)** — 2/2: Resumo do personal só "Upload"; clínica com todas as ações — `qa/screenshots/t-29b-*.png`.

## Respostas ao code review (7 achados)
| # | Achado | Disposição |
|---|--------|-----------|
| 1 | `ai-import` fora das sub-rotas bloqueadas (personal criava screening+SOAP) | ✅ adicionado a `CLINICAL_PATIENT_SUBROUTES`; G5b confirma 404. |
| 2 | Painéis (TabsContent) clínicos montavam mesmo com trigger escondido | ✅ safety-net no `activeTab` (nunca fica clínico para personal). |
| 3 | Ações clínicas do Resumo (SOAP Note etc.) não gated | ✅ gated com `!isPersonal`; re-QA 2/2. |
| 4/5 | AI Assessment/Import e Red Flags/Queixa no Resumo | ✅ gated. |
| 6 | Nome `clinical-routes` conflava clínico com marketing | ✅ renomeado → `personal-blocked-routes` / `isPersonalBlockedRoute`. |
| 7 | Cobertura de teste (email-templates/sales/ai-import) | ✅ adicionada. |

## Critérios de aceite
- [x] Personal não vê abas clínicas nem AI Assessment; vê Resumo/Documentos/Mensagens/Exercícios/Workouts.
- [x] Personal não vê Marketing; /admin/marketing e /admin/articles redirecionam.
- [x] Regressão: a clínica continua com tudo.

## Pendência sinalizada (fora do escopo)
- `/staff-login` retornou 404 no dev (o qa-tester usou `/login`). Investigar à parte.

**Conclusão: APROVADO.**
