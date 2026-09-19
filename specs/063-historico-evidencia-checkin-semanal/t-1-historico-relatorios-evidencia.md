# T-1: Histórico de relatórios de evidência clínica

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
No admin, ver a sequência completa de relatórios de evidência de um paciente — do primeiro
(preliminar, gerado antes da triagem) até o mais recente — não só o último.

## Contexto
O model `ClinicalEvidenceReport` e o pipeline de geração automática (ativs. 014/015) já existem e
não são tocados aqui. Só falta expor o histórico: a rota hoje faz `findFirst`, a aba só renderiza
um registro. Ver `plan.md` pra decisões de design (item 1 e 2) e o padrão de referência
(`app/api/patient/outcome-measures/route.ts`, parâmetro `?history=true`).

## Passos
1. Em `app/api/admin/patients/[id]/evidence-report/route.ts`, no `GET`: se
   `req.nextUrl.searchParams.get("history") === "true"`, trocar o `findFirst` por `findMany`
   (mesmo `where`, `orderBy: { createdAt: "desc" }`, sem `take` — histórico completo) e devolver
   `{ reports: [...] }`. Sem o parâmetro, comportamento atual preservado (`{ report }`, um só).
2. Em `components/admin/evidence-report-tab.tsx`: buscar `?history=true` além do estado atual (ou
   no lugar dele, se fizer sentido reaproveitar o mesmo fetch — decidir durante a implementação
   olhando o componente real). Renderizar uma lista/timeline ordenada do mais recente pro mais
   antigo, reaproveitando os componentes de badge/status já usados hoje pro registro único.
3. Cada item da timeline expansível (accordion ou similar) mostrando: data, badge de status,
   `caseSummary` resumido, narrativa (`narrativeEn`/`narrativePt` conforme idioma ativo), e o
   botão "marcar como revisado" chamando o `PATCH` já existente com o `reportId` daquele item
   específico (a rota já é genérica por id, não precisa mudar).
4. Conferir que o relatório mais recente continua aparecendo em destaque/expandido por padrão
   (é o que importa no dia a dia), com os anteriores colapsados.

## Arquivos afetados
- `app/api/admin/patients/[id]/evidence-report/route.ts`
- `components/admin/evidence-report-tab.tsx`

## Critérios de aceite
- [ ] Paciente com múltiplos relatórios: admin vê todos, ordenados do mais recente pro mais
      antigo, nenhum escondido.
- [ ] Paciente com um relatório só: comportamento equivalente ao atual (sem regressão visual).
- [ ] Paciente sem nenhum relatório: estado vazio claro (sem erro, sem timeline quebrada).
- [ ] "Marcar como revisado" funciona em qualquer item da timeline, não só no mais recente.
- [ ] Chamada sem `?history=true` na rota continua devolvendo só o mais recente (compatibilidade).
- [x] Isolamento cross-tenant: histórico de uma clínica nunca aparece pra outra (já garantido por
      `staffPatientAccess`, mas confirmar no QA).

## QA e code review

QA (agente qa-tester): 11/11 cenários aprovados (API + UI), `qa/report-t-1.md`. Fixture nova em
`scripts/qa/t063-evidence-history-fixtures.cjs` (mantida no repo).

Code review: achou 2 pontos reais, corrigidos antes de marcar concluído —
1. Na extração do `translate()` pra dentro de `ReportBody`, o `setLang("pt")` do código original
   se perdeu (regressão de comportamento, fora do escopo coberto pela qa-spec). Corrigido com uma
   prop `onTranslated` passada de `EvidenceReportTab` até `ReportBody`/`ReportCard`. Revalidado
   manualmente via Playwright (fixture `qa.pacientea`): tradução real via IA, texto troca pra PT,
   sem erro.
2. `findMany` do histórico sem `take` podia crescer sem limite a cada regeneração. Adicionado
   `take: 50` na rota.

Sem outros achados.
