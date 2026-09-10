# QA T-19b (parte 2) — Catálogo de serviços do tenant

**Atividade:** specs/20-multitenant-clinica-e-personal
**Tarefa:** T-19b — sub-parte "catálogo de serviços no diálogo de nova sessão"
**Data:** 2026-09-10
**Ambiente:** dev local http://localhost:4193 (banco `bpr_clinic_local`), fixtures de 2 tenants.
**Resultado:** ✅ **APROVADO** (2/2)

## Mudança
`app/admin/appointments/page.tsx` — o dropdown "Treatment Type" do diálogo de nova consulta já usava `TreatmentType` por tenant quando havia registros. O fallback (sem registros) impunha a lista fixa de fisioterapia a qualquer tenant. Agora o fallback é escopado por tipo: **tenant personal sem serviços** vê "No services configured yet" (item desabilitado), **nunca** a lista de fisioterapia; **clínica** mantém a lista fixa (regressão preservada).

## Evidências (Playwright, snapshots de acessibilidade)

| # | Tenant | Esperado | Obtido | Resultado |
|---|--------|----------|--------|-----------|
| 1 | PERSONAL `qa-studio-pt` (qa.trainer) | só "No services configured yet"; sem fisio | listbox só com `No services configured yet` [disabled] | ✅ PASS |
| 2 | CLINIC `qa-clinic-a` (qa.admina) | lista fixa de fisioterapia | Initial Assessment, Follow-up, Sports Massage, Electrotherapy, Shockwave, Rehabilitation | ✅ PASS |

Nav confirmou o contexto: personal exibe "Students/Training/Sessions"; clínica exibe "Patients/Clinical/Appointments". Zero erros/warnings de console nos dois fluxos.

Screenshots:
- `qa/screenshots/t-19b-catalogo-personal-sem-servicos.png`
- `qa/screenshots/t-19b-catalogo-clinica-lista-fixa.png`

## Observações
- Nenhum tenant de fixture tem `TreatmentType` ativo — os dois cenários cobrem exatamente os dois ramos do fallback (personal → aviso; clínica → lista fixa), que é o foco da correção. O ramo "tenant com catálogo próprio" é o comportamento pré-existente (código inalterado).
- Label "Treatment Type" singular ainda não é relabelado para "Session Type" no personal — cauda-longa de vocabulário (T-18), fora do escopo do catálogo.

## Resposta ao code review
- **Achado #3** (flash da lista físio no personal enquanto a sessão carrega): ✅ **corrigido** — o fallback de fisioterapia só renderiza quando a sessão está resolvida **e** o tenant não é personal (`vocabReady && !isPersonal`); durante o load (tipo desconhecido) mostra o aviso "No services configured yet", nunca físio. `useVocab` passou a expor `ready`. Os dois estados estáveis (clínica→físio; personal→aviso) permanecem idênticos aos já aprovados acima; a mudança afeta apenas o frame de carregamento.

**Conclusão: APROVADO.**
