# QA Report — T-4: Tendência de aderência

**Data:** 2026-08-22
**Resultado geral:** APROVADO (5/5)

| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 4.1 | `GET /adherence?range=90d` série semanal | API | APROVADO |
| 4.2 | Sem sessão → 401 | API | APROVADO (com ressalva) |
| 4.3 | Sem check-ins → série vazia | API | APROVADO (por código) |
| 4.4 | Bloco de aderência na seção + vazio tratado | UI | APROVADO |
| 4.5 | Locale PT/EN | UI | APROVADO |

**4.1** `GET /api/patient/adherence?range=90d` → 200, série agregada por semana (segunda UTC)
com `periodStart,doneCount,totalDays,percent`. 7 semanas (2026-07-06 a 2026-08-17); ex.:
`{"periodStart":"2026-07-27","doneCount":4,"totalDays":4,"percent":100}`. Soma `totalDays`=31
(= 31 check-ins semeados); `doneCount`=23 → ~74% geral. `range=30d` → 5 semanas; `all` → 7.

**4.2** Com ressalva (mesma da T-1.6). App-token inválido → `401`. Web sem cookie → middleware
`307` → `/login?callbackUrl=%2Fapi%2Fpatient%2Fadherence`. Acesso negado nos dois.

**4.3** Por código: sem check-ins o `Map` de semanas fica vazio → `200 {series:[]}` (`route.ts`).

**4.4** Bloco "Aderência (semanal)" como barras teal (`#14b8a6`), headline 67%, delta -8%
(chip vermelho, `higherIsBetter=true`). `t3-meu-progresso-claro.png`. Só aparece se
`hasAdherence`; variante bar exige `valued.length>=1`.

**4.5** PT "Aderência (semanal)"; EN "Adherence (weekly)" (`t3-locale-en.png`).

Console: 0 erros.

---

## Resumo da atividade 13
**Total: 24/25 cenários aprovados, 0 reprovados, 1 ressalva** (tema escuro — não-bloqueante).
Pontos de atenção não-bloqueantes: (1) auth web sem sessão devolve `307` (redirect do
middleware) em vez de `401` literal — comportamento pré-existente do middleware, seguro;
(2) tema escuro do TrendChart não é validável (dashboard do paciente é light-only por design).
