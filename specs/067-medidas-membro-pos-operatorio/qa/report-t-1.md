# QA report — T-1 (Model + API) — atividade 067

**Veredito: APROVADO** (cenários 1–7; cenário 4 com ressalva de spec). Ambiente local (`bpr_clinic_local`), dev server em `localhost:4210`, sessão por cookie fabricado (`next-auth/jwt encode`). Executado pelo agente qa-tester; relatório consolidado pela sessão principal porque o agente não pôde gravar arquivos.

Fixtures (removidas ao final): paciente com protocolo `startDate` = 21 dias atrás à meia-noite local; paciente sem protocolo; aluno de estúdio; contas QA existentes (staff clínica A, staff clínica C, personal, paciente).

| # | Cenário | Resultado | Evidência |
|---|---|---|---|
| 1 | POST válido → 201, semana e lado | APROVADO | `201 … "operatedSide":"LEFT","protocolWeek":4`. Semanas: 10 e 14 dias atrás = 2; 15 e 21 dias atrás = 1; 25 dias atrás (antes do início) = null; exatamente 7 dias após o início = 2. Paciente sem protocolo: `protocolId` e `protocolWeek` null. |
| 2 | POST sem valor numérico | APROVADO | 400 "Enter at least one thigh measurement or knee angle" (só lado; só distância/nota; nulls e vazios). |
| 3 | Valores inválidos | APROVADO | 400 para flexão 250, circunferência 500, data futura, lado `BOTH`, lado ausente; também 400 para extensão −41/31, flexão 90.5, circunferência 9.9, texto "abc", distância 61, `romMode` inválido, data inválida, corpo não-JSON. |
| 4 | Sem sessão → 401 | APROVADO c/ ressalva | Sem cookie a resposta é `307 → /login?callbackUrl=…` (middleware de `/api/admin/*`, igual ao endpoint antigo `GET /api/admin/patients`). Com JWT válido de usuário inexistente: `401 {"error":"Unauthorized"}` em GET e POST. Critério da spec ajustado para "sem sessão → redirect do middleware; sessão inválida → 401". |
| 5 | Staff de outra clínica | APROVADO | 404 em GET, POST, PATCH e DELETE, sem alterar nada. Staff do estúdio no paciente da clínica: 404. Staff da clínica no aluno do estúdio: 404. Staff da mesma clínica: 200. |
| 6 | PATCH | APROVADO | Trocar a data recalcula a semana (4 → 2 → null → 4); limpar campo vira null; valores inválidos 400; id inexistente 404. |
| 7 | DELETE/PATCH de outro paciente | APROVADO | 404 nos dois sentidos; DELETE próprio 200, repetido 404. |

## Achados e tratamento
1. **API não restringe por tipo de tenant** — o staff do estúdio personal consegue GET/POST no aluno do próprio estúdio (200/201). Não há vazamento entre tenants; só a UI esconde a aba (mesma convenção `isPersonal` das outras áreas clínicas). `Actor` não carrega tipo de tenant. **Não alterado — decisão de produto pendente com o Bruno.**
2. `num()` aceitava array como número (`{"flexionDeg":[]}` gravava 0). **Corrigido** em `lib/limb-measurements.ts` (só number/string; teste: array, objeto e boolean → 400).
3. PATCH podia esvaziar o registro (`flexionDeg:null, extensionDeg:null`). **Corrigido**: a rota PATCH exige ao menos um valor após o merge (helper `hasMeasurement`); teste do helper OK. *Não reexecutado via HTTP após a correção* — ver "Reteste".

## Reteste das correções (mesmo setup, banco local) — APROVADO
- Coerção numérica: `flexionDeg` como `[]`, `{}`, `true`, `[90]` e `vmoLeftCm: []` → 400 "… must be a number", nada gravado. Continuam 201: `"50,5"` (grava 50.5), `"120"`/`"-3"` como strings inteiras, inteiros normais; `90.5` segue 400 "must be a whole number".
- PATCH que esvaziaria o registro (`null`, `""`, ou coxa+ROM juntos) → 400 "A measurement needs at least one thigh value or knee angle; delete it instead", registro intacto. Limpar só um campo, editar só `notes` ou só `operatedSide` → 200 com valores preservados.

## Reteste 2 (após code review) — APROVADO
- Protocolo ativo = só `SENT_TO_PATIENT` com `startDate`: A enviado + B rascunho mais novo (início futuro) → medida de hoje grava A, semana 4; com B enviado passa a valer B (semana null, início futuro).
- PATCH só de `notes`, ou com o mesmo dia em `measuredAt` (com e sem `Z`) + valor alterado, mantém protocolo A/semana 4 e o `measuredAt` original; PATCH com outro dia recalcula contra o protocolo ativo daquele momento.
- Semana por dia calendário (UTC): protocolo iniciado hoje 15:00Z + medida de hoje 12:00Z = semana 1 (antes null); véspera = null; início+6 = 1; início+7 = 2.
- Validação: `" "` = vazio (201 com flexão null se houver outra medida; 400 se for o único), `"0x10"`, `"1e1"`, `"Infinity"`, `"-3,5"` (inteiro) → 400; `measuredAt` 0/true/[]/1999 → 400; "12 " e "2026-09-10" aceitos.
