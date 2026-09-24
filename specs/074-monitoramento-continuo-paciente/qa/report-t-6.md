# QA Report — T-6: Relatório consolidado do paciente (tela)

**Data:** 23/09/2026
**Ambiente:** worktree `C:\Users\bruno\orca\workspaces\clinic\app_clinic`, servidor `http://localhost:4010`
(PID 27364 → `…app_clinic\node_modules\next\…`, iniciado por `next dev -p 4010` deste worktree — confirmado
com `netstat -ano | grep 4010` + `Get-CimInstance Win32_Process`). Banco `bpr_clinic_local`.
**Resultado geral:** ⚠️ **aprovado com ressalvas** — 1 falha funcional (o período truncava o dia de hoje) e 3 observações.

> **Correção aplicada depois deste QA.** A falha do cenário 11 foi corrigida em `lib/patient-report.ts`
> (`dayBoundary` + `periodFromQuery`): uma data sem hora passa a valer o dia inteiro — `to` vira
> 23:59:59.999 e `from` vira 00:00:00.000. Prova:
> ```
> to=2026-09-23 (sem hora) → 2026-09-23T23:59:59.999Z
> from=2026-06-25 (sem hora) → 2026-06-25T00:00:00.000Z
> from/to com hora explícita → preservados como vieram
> ```
> As observações 2, 3 e 4 também foram tratadas (fonte da aderência nomeada no rótulo, triagem e
> protocolo marcados como "registro atual — não recortado pelo período", botão renomeado para
> "Refresh"/"Atualizar"). **Falta reteste.**

## Dados de teste criados por este QA (isolados)

Não toquei na clínica `QA BP T3` (`cmueo008a0000xzyk1pej8u8g`) nem no paciente `cmueo008o0004xzyklpa8k3p3`.

| O quê | id / slug |
|---|---|
| Clínica sob teste | `QA Report Clinic T6` · `qa-report-t6` · `cmueoinz40000xznwezwmlgxq` |
| Clínica "de fora" | `QA Other Clinic T6` · `qa-report-t6-other` · `cmueoinzc0001xznwvegx7bki` |
| Admin da clínica A | `qa-t6-admin@example.com` · `cmueoinzj0003xznwgxq8ayqv` |
| Terapeuta da clínica A | `qa-t6-therapist@example.com` · `cmueoinzr0005xznw53hy6qjs` |
| Admin da clínica B | `qa-t6-admin-other@example.com` · `cmueoinzx0007xznwaijok0b9` |
| Paciente de teste (com dado) | `qa-t6-patient@example.com` · `cmueoio020009xznwrt4zz1pj` |
| Paciente de teste sem nenhum dado | `qa-t6-empty@example.com` · `cmueorb7m0001xzfc3gvoc2g8` |
| Paciente da clínica B | `qa-t6-patient-other@example.com` · `cmueoio08000bxznw2bkdktxb` |

Semeado no paciente `Qa TestPatient`, espalhado nos últimos 90 dias: triagem (2 red flags), 1 protocolo
`SENT_TO_PATIENT` com 3 itens, 2 prescrições ativas, 59 logs de conclusão em 44 dias, 90 check-ins,
60 leituras de PA (12 ≥ 130/80), 4 medidas de evolução, 5 consultas, 3 notas SOAP, 45 dias de wearable
(GARMIN).

## Resumo

| # | Cenário (qa-spec / pedido) | Tipo | Resultado |
|---|---|---|---|
| 1 | 6.1 — dado nas nove áreas aparece no período | UI | ✅ |
| 2 | 6.5 — os números batem com as telas individuais e com o banco | API+UI | ✅ |
| 3 | 6.2 — período sem dado: diz que não há, não desenha gráfico vazio | UI | ✅ |
| 4 | Período custom pelos campos de data (+ presets 30/90) | UI | ✅ |
| 5 | 6.3 — staff de outra clínica / paciente / sem sessão | API | ✅ |
| 6 | 6.4 — `from` > `to`, range > 730 dias, data inválida | API | ✅ |
| 7 | 6.6 — inglês e português, inglês primeiro | UI | ✅ |
| 8 | Resposta malformada e 500: "não foi possível", nunca "nada registrado" | UI | ✅ |
| 9 | Console sem erro, nenhuma chamada de API falhando | UI | ✅ |
| 10 | 6.7 — gráfico de PA com 90 dias, escala única, limiar nomeado | UI | ✅ |
| 11 | **O período recortado pela tela excluía tudo que foi registrado HOJE** | API+UI | ❌ → corrigido |
| 12 | Regressão obrigatória da atividade (`npm run build`, 21 telas, diff de schema) | — | ⚠️ não executado (gate de fim de atividade) |

## Detalhes

### 1. Dado nas nove áreas aparece no período ✅

Seções renderizadas (extraídas do DOM):

```
["Patient report","In this period","Blood pressure","Exercise","Daily check-ins",
 "Outcome measures","Appointments","Clinical notes","Treatment protocols",
 "Medical screening","Wearable data"]
charts rendered: 8
```

Tiles de resumo lidos da tela:

```
{"Days with exercise logged":"44","Check-ins":"90","Blood pressure readings":"60",
 "Appointments":"5","Clinical notes":"3","Days with wearable data":"45",
 "Steps":"371,260","Sleep":"7.1 h","Resting heart rate":"57 bpm","HRV":"53 ms","SpO₂":"96%"}
```

**Evidência:** `screenshots/t-6-tela-en-90d.png`, `screenshots/t-6-ficha-botao-report.png`

### 2. Os números batem com as telas individuais e com o banco ✅

Contra a aba de pressão (`GET /api/admin/patients/<id>/blood-pressure?days=90`): `count 60`, primeira
`2026-06-26T08:30`, última `2026-09-22T08:30` — **bate item a item** com o relatório. Contra a ficha:
`soapNotes 3`, `protocols 1` — bate.

Contra o banco, nas duas janelas:

| Janela | exerciseDays | checkIns | BP | BP ≥ 130/80 | consultas | notas | wearable |
|---|---|---|---|---|---|---|---|
| 25/06–23/09 — banco | 44 | 90 | 60 | 12 | 5 | 3 | 45 |
| 25/06–23/09 — tela | 44 | 90 | 60 | 12 | 5 | 3 | 45 |
| 01/08–31/08 — banco | 16 | 31 | 20 | 4 | 1 | 1 | 15 |
| 01/08–31/08 — tela | 16 | 31 | 20 | 4 | 1 | 1 | 15 |

> **Observação (não é falha de T-6):** o gráfico de aderência do **paciente** (`/api/patient/adherence`)
> deriva de `DailyCheckIn.exercisesDone` (auto-declarado), enquanto o relatório conta
> `ExerciseCompletionLog`. No paciente semeado deu **45 × 44** sobre dias disjuntos. Os dois números são
> legítimos, mas um terapeuta que comparar as telas vai achar que uma está errada.
> **Tratado:** o rótulo agora diz "registrado no app" / "logged in the app", nomeando a fonte.

### 3. Período sem nenhum dado ✅

```
[2020 period] charts rendered: 0
[2020 period] empty messages: ["No reading in this period.","No exercise logged in this period.",
  "No check-in in this period.","No outcome measure recorded in this period.",
  "No appointment in this period.","No clinical note in this period.","No wearable data in this period."]
```

Paciente sem nada registrado: painel "Nothing was recorded for this patient in this period.", 0 gráficos.

**Evidência:** `screenshots/t-6-periodo-sem-dado-2020.png`, `screenshots/t-6-paciente-sem-nada.png`

> **Observação:** triagem, protocolos e prescrições não são recortados pelo período (intenção declarada
> no código). Na janela de 2020 a tela ainda exibia o protocolo de 2026 sob um cabeçalho que diz "in the
> period". **Tratado:** as duas seções passam a dizer "Current record — not limited to the period".

### 4. Período custom e presets ✅

| Seleção | Tiles |
|---|---|
| Campos de data 01/08→31/08 | 16 · 31 · 20 · 1 · 1 · 15 |
| Preset "Last 30 days" | 15 · 31 · 20 · 2 · 0 · 16 |

**Evidência:** `screenshots/t-6-periodo-custom-agosto.png`, `screenshots/t-6-preset-30d.png`

### 5. Escopo por tenant ✅

| Chamada | Obtido |
|---|---|
| `GET …/report` como admin da clínica B | `404` · `{"error":"Patient not found"}` |
| `GET …/report/pdf` como admin da clínica B | `404` · `{"error":"Patient not found"}` |
| `GET …/report` como o próprio paciente | `403` · `{"error":"Forbidden"}` |
| `GET …/report/pdf` como o próprio paciente | `403` · `{"error":"Forbidden"}` |
| `GET …/report` sem sessão | `307` → `/login` (middleware, nada no corpo) |
| paciente da clínica B, como admin A | `404` |
| terapeuta da clínica A | `200` com o relatório |
| id inexistente | `404` |

Guard é `staffPatientAccess` (→ `getActor`), não `session.user.clinicId`.

### 6. Validação de período ✅

```
from posterior a to            → 400 {"error":"`from` must be before `to`"}
range acima de 730 dias        → 400 {"error":"Range cannot exceed 730 days"}
data inválida (from=not-a-date)→ 400 {"error":"Invalid date range"}
PDF, mesmos casos              → 400, idênticos
```

### 7. Bilíngue, inglês primeiro ✅

```
[pt-BR] English strings still on screen: ["Check-ins\n"]   ← é a forma usada no dicionário pt-BR
[pt-BR] Portuguese strings present: ["Relatório do paciente","No período","Pressão arterial",
  "Exercícios","Check-ins diários","Medidas de evolução","Consultas","Notas clínicas",
  "Protocolos de tratamento","Triagem","Dados de wearable","Baixar PDF","Últimos 90 dias","Limiar de alerta"]
```

**Evidência:** `screenshots/t-6-tela-pt-90d.png`

### 8. Resposta malformada não vira "nada registrado" ✅

| Injeção | "We could not build the report." | "Nothing was recorded" |
|---|---|---|
| `200` com corpo `{"ok":true,"garbage":1}` | sim | não |
| `500` com corpo `boom` | sim | não |

**Evidência:** `screenshots/t-6-resposta-malformada.png`, `screenshots/t-6-resposta-500.png`

### 9. Console e rede ✅

```
=== CONSOLE (errors/warnings) ===   (none)
=== FAILED REQUESTS ===             (none)
=== API CALLS ===  200 em todas, incluindo /report?from=2026-06-25&to=2026-09-23
```

### 10. Gráfico de PA com 90 dias ✅

60 leituras num único `<YAxis domain={[40,"auto"]}>` com as três séries na mesma escala, `ReferenceLine`
rotulada com o número da clínica ("Alert threshold 130"), vindo de `thresholds` da API (regra de T-3).

*Nit:* o rótulo sobrepõe a série na borda direita.

### 11. ❌→corrigido — O período excluía o dia de hoje

Com uma leitura **199/111**, uma consulta e uma nota datadas de hoje:

```
### to=2026-09-23  (o que a tela mandava)
bp 60 | notes 3 | appts 5
contains the 199/111 reading dated today? false
contains the today appointment?          false
contains the today note?                 false

### sem from/to (default da rota: to = agora)
bp 61 | contains 199/111? true
```

Pior, o relatório ficava incoerente consigo mesmo: check-ins e wearable, filtrados por *string* de data,
**incluíam** hoje; pressão, consultas e notas, filtradas por *timestamp*, não.

**Causa:** `new Date("2026-09-23")` = meia-noite. **Correção:** `dayBoundary` em `lib/patient-report.ts`,
que faz uma data sem hora valer o dia inteiro — conserta tela e PDF de uma vez, porque os dois passam
pela mesma função.

### 12. ⚠️ Regressão de fim de atividade — não executada

`npm run build`, 21 telas nos dois idiomas e diff de schema são o gate de fim de atividade, não de T-6.

## Falhas e recomendações

1. **(corrigida)** O dia de hoje sumia do relatório — `periodFromQuery`.
2. **(tratada)** Duas definições de aderência: o rótulo agora nomeia a fonte.
3. **(tratada)** Triagem/protocolo fora do período, sob título que dizia "no período".
4. **(tratado)** "Try again" virou "Refresh"/"Atualizar" quando nada falhou. Continua aberto o nit do
   rótulo do limiar sobrepondo a série na borda do gráfico.

## Fora do escopo desta passagem

- Regressão de fim de atividade (`npm run build`, 21 telas, `tsc` do mobile, diff de schema).
- QA em produção — pela regra do projeto, depois do deploy.
- Clínica `QA BP T3` e paciente `cmueo008o0004xzyklpa8k3p3`, que eram de outro agente.
