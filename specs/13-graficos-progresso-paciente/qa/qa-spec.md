# QA — Atividade 13: Gráficos de progresso do paciente

Evidências em `qa/screenshots/`. Cada tarefa gera `qa/report-t-N.md`.
A feature **tem autenticação** (sessão do paciente / token do app) → cenários de auth incluídos.

Pré-condição comum: um paciente de teste com **≥3** `PatientOutcomeMeasure` em datas
diferentes (para haver linha) e um paciente **sem** medidas (para estado vazio).

---

## T-1 — API de histórico (API)

| # | Tipo | Passos | Resultado esperado |
|---|------|--------|--------------------|
| 1.1 | API | `GET /api/patient/outcome-measures` autenticado, **sem** params | Mesmo shape de hoje: `{ measures: {...} }` com o registro mais recente |
| 1.2 | API | `GET ...?history=true` autenticado | `{ series: [...] }` ordenada por `recordedAt` **asc**; campos vas/faam%/overall |
| 1.3 | API | `GET ...?history=true&range=30d` | Só registros dos últimos 30 dias |
| 1.4 | API | `GET ...?history=true&range=all` | Todos os registros |
| 1.5 | API | Paciente **sem** medidas, `?history=true` | `200` com `{ series: [] }` |
| 1.6 | API | **Sem** sessão / token inválido | `401 Unauthorized` |
| 1.7 | API | Confirmar que a série é só do paciente logado (não vaza de outro `patientId`) | Nenhum registro de outro paciente presente |

## T-2 — Componente TrendChart (UI)

| # | Tipo | Passos | Resultado esperado |
|---|------|--------|--------------------|
| 2.1 | UI | Renderizar com série de ≥2 pontos | Linha desenhada, pontos e último valor em destaque |
| 2.2 | UI | Renderizar com 1 ponto / 0 pontos | Estado vazio ("histórico insuficiente"), sem SVG quebrado |
| 2.3 | UI | Alternar tema claro/escuro | Cores legíveis nos dois; nada some no dark |
| 2.4 | UI | `higherIsBetter=false` (dor) vs `true` (função) | Indicação de tendência coerente (cair = bom na dor) |
| 2.5 | UI | Viewport estreito (390px) | Sem scroll horizontal na página; gráfico se adapta |
| 2.6 | build | `git diff package.json` | **Nenhuma** dependência nova adicionada |

## T-3 — Seção "Meu progresso" (UI)

| # | Tipo | Passos | Resultado esperado |
|---|------|--------|--------------------|
| 3.1 | UI | Abrir `/dashboard/follow-up` como paciente com histórico | Seção "Meu progresso" com gráficos de dor, FAAM ADL%, Sport%, função geral |
| 3.2 | UI | Conferir valores contra os registros do banco | Linhas batem com os dados reais |
| 3.3 | UI | Trocar janela 30d / 90d / tudo | Série exibida muda conforme a seleção |
| 3.4 | UI | Paciente **sem** histórico | Estado vazio com CTA para registrar medida (link p/ outcome-measures) |
| 3.5 | UI | Locale PT-BR e EN-GB | Textos traduzidos; default inglês se nada escolhido |
| 3.6 | UI | Verificar timeline/scores atuais que já existiam | Continuam intactos (sem regressão) |
| 3.7 | UI | App Capacitor (ou viewport mobile) | Seção renderiza igual (mesma base de código) |

## T-4 — Tendência de aderência (API + UI)

| # | Tipo | Passos | Resultado esperado |
|---|------|--------|--------------------|
| 4.1 | API | `GET /api/patient/adherence?range=90d` autenticado | Série agregada por semana: `doneCount/totalDays/percent` |
| 4.2 | API | Sem sessão | `401` |
| 4.3 | API | Paciente sem check-ins | `200` com série vazia |
| 4.4 | UI | Bloco de aderência na seção "Meu progresso" | Mostra aderência ao longo do tempo; estado vazio tratado |
| 4.5 | UI | Locale PT/EN | Textos corretos nos dois idiomas |
