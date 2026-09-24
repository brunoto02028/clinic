# QA Report — T-8: Sync Withings completo

**Data:** 24/09/2026 · **Servidor:** `http://localhost:4010` (deste worktree) · **Banco:** `bpr_clinic_local`
**Dados:** prefixo `qa-t8t10-`. A conta Withings real (`Development`) **não** foi usada.
**Resultado geral:** ⚠️ **aprovado com ressalvas** — o `getmeas` está provado ponta a ponta; o **ECG não**.

| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | `vitalsByDay` — testes unitários | Unit | ✅ |
| 2 | Mapeamento para o banco pelo caminho do `ingestWithings` | Integração (DB real) | ✅ |
| 3 | Falha nas métricas novas não derruba pressão/sono/atividade | Integração + rota | ✅ |
| 4a | `withingsEcg` devolve lista vazia sem lançar | Integração | ✅ |
| 4b | Forma real da resposta do `v2/heart` | — | ⚠️ **não executável** |
| 5 | Conta sem SpO2/temperatura sincroniza o resto sem erro | Integração (DB real) | ✅ |
| 6 | "Token expirado renova e o sync continua" | — | ⚠️ **não executável** |

## Evidências

**2 — mapeamento**, com a rede mockada só em `withingsRawCall` e o resto percorrendo
`withingsVitals → vitalsByDay → upsertPoint → Postgres`, igual a produção.

Entrada: 20/09 07:00 `HR 58, SpO2 96, temp 36.6` · 20/09 12:00 `HR 120, SpO2 98, temp 36.8` ·
20/09 18:00 `HR 74` · 21/09 08:00 `SpO2 95`.

```json
retorno: {"bloodPressure":0,"activityDays":0,"sleepNights":0,"vitalsDays":2,"ecgRecords":0}
banco:
[{"dataDate":"2026-09-20","dataType":"VITALS","spo2":97,"bodyTemperature":36.7,
  "restingHr":58,"rawPayload":"{\"samples\":3}"},
 {"dataDate":"2026-09-21","dataType":"VITALS","spo2":95,"bodyTemperature":null,
  "restingHr":null,"rawPayload":"{\"samples\":1}"}]
```

| Exigência | Verificado |
|---|---|
| uma linha por dia, `dataType: VITALS` | ✅ |
| métrica ausente **null**, nunca 0 | ✅ dia 21 |
| `restingHr` é a **mínima** do dia | ✅ 58 (a média de 58/120/74 seria 84) |
| `rawPayload` traz a contagem de amostras | ✅ |

**3 — falha isolada.** Com `withingsRawCall` lançando `401 invalid_token` só nas métricas novas:

```
[withings-ingest] vitals failed: Withings 401: invalid_token
RESULT: {"bloodPressure":1,"activityDays":1,"sleepNights":1,"vitalsDays":0,"ecgRecords":0}
rota POST /api/wearables/sync → HTTP 200 (não 500), conexão segue CONNECTED
```

**4a — ECG ausente não é erro:** `[withings-vitals] no ECG available: Withings 503: unauthorized service`
→ `[]`, e `ecgRecords: 0` sem impacto no resto.

**5 — conta só com FC:** `{"spo2":null,"bodyTemperature":null,"restingHr":61,"samples":1}`. Nada
inventado.

## O que **não** está provado

**4b — a forma real da resposta do `v2/heart` nunca foi vista.** A conta Withings está em
`Development` e não há de onde puxar um ECG real. Só o caminho de falha foi exercitado. O mapeamento
(`s.ecg.afib`, `s.heart_rate`, `s.ecg.signalid`, `s.timestamp ?? s.date`) é um palpite defensivo
sobre campos que ninguém confirmou. **Não considerar o ECG entregue** até conferir contra conta real
com exame gravado — é por isso que `withingsEcg` guarda o `raw` inteiro.

**6 — renovação de token** exige um par válido de conta real (o refresh gira a cada uso).

## Achados e o que foi feito

1. **⚠️ → corrigido — `skinTemperature` era coletada e descartada.** `withingsVitals` lia o
   `meastype` 73 e `vitalsByDay` nunca usava: a temperatura de pele não chegava ao banco, embora o
   cabeçalho do arquivo dissesse que sim. **Corrigido:** vai para o `rawPayload` (não há coluna, e
   temperatura de pele **não** é temperatura corporal — não pode ocupar aquela coluna).
2. **⚠️ → corrigido — grupos que só traziam temperatura de pele inflavam `samples`.** O campo é
   apresentado como "de quantas medições isto veio"; passou a contar só as que contribuíram com um
   valor que o dia usa.
3. **Observação (não é defeito):** HRV não passa por aqui — continua vindo do `getsummary` e indo
   para a linha `SLEEP` (código da ativ. 070). O critério "SpO2/HRV/temperatura" se apoia em dois
   caminhos e só um é T-8.
