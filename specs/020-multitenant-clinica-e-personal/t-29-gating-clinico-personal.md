# T-29: Esconder tudo que é clínico do tenant personal

**Status:** concluído
**Trilha:** PERSONAL
**Depende de:** T-19b

> QA aprovado (qa/report-t-29.md — 4/4 + re-QA 2/2) + review feito (7 achados: 6 corrigidos, incl. leak do ai-import e ações do Resumo; 1 refactor de nome). jest 111, runtime 43/43.

## Objetivo
Um tenant personal não deve ver nem acessar nada clínico da BPR (pedido do Bruno ao revisar T-21/T-24). Estende o gating da T-19b para as sub-abas da ficha do aluno e para o Marketing.

## Decisões (Bruno)
- **Ficha do aluno (personal):** esconder Screening, Avaliações (body assessment), Notas Clínicas, Protocolo, Rehab Agent, Evidência + botão "AI Assessment". Manter: Resumo, Exercícios, Documentos, Mensagens, Workouts.
- **Marketing:** esconder do personal (sidebar + URL) — conteúdo é da clínica/BPR.
- Bloquear também por URL, não só esconder.

## Passos
1. `lib/admin-sections.ts`: seção `marketing` marcada como oculta para personal (`clinicalOnly`).
2. `lib/clinical-routes.ts`: adicionar rotas de marketing (`/admin/marketing`, `/admin/articles`, `/admin/email*`, `/admin/education`, `/admin/sales`) à lista bloqueada por URL para personal.
3. `app/admin/patients/[id]/page.tsx`: as 6 abas clínicas e o botão AI Assessment atrás de `!isPersonal`.

## Critérios de aceite
- [x] Personal não vê as abas clínicas na ficha nem o botão AI Assessment; vê Resumo/Documentos/Mensagens/Exercícios/Workouts.
- [x] Personal não vê Marketing na sidebar; /admin/marketing e /admin/articles redirecionam.
- [x] Regressão: a clínica continua com tudo (abas clínicas + Marketing).
