# QA Report — T-14: Dispositivo da clínica — sessão de medição e atribuição

**Data:** 24/09/2026 · **Worktree:** `C:\Users\bruno\orca\workspaces\clinic\app_clinic`
**Servidor:** `http://localhost:4010` (PID confirmado como `start-server.js` deste worktree) ·
**Banco:** `bpr_clinic_local`
**Resultado geral:** ⚠️ **aprovado com uma ressalva** (cenário 11), **corrigida depois deste QA**

## Resumo

| # | Cenário | Tipo | Resultado |
|---|---|---|---|
| 1 | Medida dentro da janela → prontuário certo, `CLINIC_DEVICE`, contexto, `recordedById` | lib | ✅ |
| 2 | Medida 10 min após expirar → `UnassignedMeasurement`, nenhum prontuário | lib | ✅ |
| 3 | Medida dentro de duas janelas → caixa de entrada (`ambiguous`) | lib | ✅ |
| 4 | 20 s antes atribui / 40 s antes não (folga de 30 s) | lib | ✅ |
| 5 | Dedup por `grpid`, inclusive de medida já atribuída | lib | ✅ |
| 6 | Aparelho da clínica A não é capturado por sessão da clínica B | lib | ✅ |
| 7 | Sessão vencida vira `EXPIRED` na leitura, sem cron | API | ✅ |
| 8 | Segunda sessão no aparelho → 409 dizendo quem espera | API | ✅ |
| 9 | Staff de outra clínica / paciente / anônimo recusados | API | ✅ |
| 10 | `AuditLog` de abertura, cancelamento e atribuição automática | API+DB | ✅ |
| 11 | **Paciente com aparelho próprio: `source` ficava `MANUAL`** | lib | ❌ → corrigido |
| 12 | Índice único recusa duas conexões com o mesmo `providerUserId` | DB | ✅ |
| — | Conectar o aparelho pelo OAuth real | OAuth | ⚠️ não executado |

## Evidências decisivas

**1 — atribuição dentro da janela**

```json
{"kind":"assigned","patientId":"…w3c000a…","readingId":"cmuf017ep0003xzl4672ax56x","sessionId":"cmuf017dp0001xzl4bvy2c6hy"}
{"method":"CLINIC_DEVICE","source":"CLINIC_DEVICE","context":"PRE_SESSION",
 "recordedById":"…vy10004…","systolic":131,"diastolic":84,"heartRate":68,
 "withingsMeasureId":"qa-t14-m1","notes":"Withings (clinic device)"}
sessão → {"status":"COMPLETED","readingId":"cmuf017ep0003xzl4672ax56x","closedAt":"…03:55:29.090Z"}
```

**2 / 3 — a dúvida nunca vira palpite:** fora de qualquer janela → `{"kind":"unassigned","reason":"no-session"}`
com `bpBefore: 1, bpAfter: 1`; dentro de duas janelas → `{"kind":"unassigned","reason":"ambiguous"}`,
também sem tocar prontuário. As duas razões são distinguidas.

**4 — a folga de 30 s da spec:** `{"atribui20s": true, "naoAtribui40s": true}`.

**5 — deduplicação nos dois lados:** 1ª entrega `unassigned`, 2ª `duplicate`, uma linha na caixa; e
uma medida **já atribuída** re-entregue → `duplicate`, `inboxBefore: 4 → inboxAfter: 4`. Este último
era um bug encontrado durante a implementação (a medida voltava para a caixa depois de arquivada,
porque a sessão já estava fechada e nenhuma janela casava) e está confirmado corrigido.

**6 — sem vazamento entre clínicas:** medida da conexão A dentro da janela da clínica B →
`unassigned` na clínica A; a sessão B continua `OPEN` com `readingId: null`; `bpClinicaB: 0 → 0`.

**7 — expiração preguiçosa:** `GET` numa sessão `OPEN` já vencida → 200 com `"status":"EXPIRED"` e
`closedAt` carimbado no instante da leitura.

**8 — uma janela por aparelho:**

```
POST → 200 (sessão do PacienteUm)
POST → 409 {"error":"A measurement is already in progress on this device",
            "errorPt":"Já existe uma medição em andamento neste aparelho",
            "open":{…,"patient":{"firstName":"QaT14","lastName":"PacienteUm"}}}
GET  → open continua sendo a 1ª sessão
```

**9 — escopo:** staff da clínica B → `404 Patient not found`; paciente → `403 Forbidden`; anônimo →
`307 → /login` (middleware antes da rota; nega e não vaza, mas um `fetch` recebe HTML).

**12 —** `P2002 · target: ["provider","providerUserId"]`.

## Cenário 11 ❌ → corrigido

```json
{"method":"MANUAL","source":"MANUAL","context":"HOME","notes":"Withings",
 "withingsMeasureId":"qa-t14-m11","recordedById":null}
{"gravouNoProprioPaciente":true,"naoPassouPelaCaixa":true}
```

Certo: vai para o próprio paciente, `context: HOME`, não passa pela atribuição. **Errado:** `source`
ficava no default `MANUAL`, e por isso a aba de pressão do admin mostrava uma leitura Withings de
casa como **"Digitada" / "Entered by hand"** — o que derruba o critério "cada leitura mostra a
origem". Screenshot: `screenshots/t-14-11-aparelho-do-paciente-aparece-como-digitada-pt.png`.

**Corrigido** em `lib/withings-ingest.ts`: `source: "PATIENT_DEVICE"` e `context: "HOME"` explícitos.

## Recomendações do QA e o que foi feito

1. `source` no `saveBloodPressure` — **corrigido**.
2. `userEmail` / `userName` vazios no `logAudit` das rotas de medição — **não corrigido**; o `userId`
   resolve, mas quem lê a auditoria precisa de um join. Fica anotado.
3. Cobrir o fluxo OAuth do aparelho da clínica com sandbox ou teste de unidade sobre o `state`
   assinado — **pendente**, depende de credenciais reais.

## Observações sobre o que mudou depois deste QA

- O índice `@@unique([provider, providerUserId])` **saiu deste deploy** (o code review mostrou que
  uma duplicata em produção faria o `prisma db push` do `start.sh` abortar inteiro, e o
  `|| echo warning` engoliria a falha: o container subiria sem as tabelas novas). A regra continua,
  no código, na rota de conexão.
- As guardas de tenant que usavam `actor.clinicId && …` viraram `!actor.clinicId || …` (eram
  fail-open para um staff cujo tenant não resolvesse).
- A expiração preguiçosa passou a ser feita só na conexão da sessão consultada, em vez de um
  `updateMany` global a cada 3 s de polling.
- Toda atribuição agora passa por `lib/bp-alerts.ts` — antes, uma leitura de 210/130 no aparelho da
  recepção entrava no prontuário sem avisar ninguém.

## Estado

Dados de teste removidos: `{"before":{"clinics":3,"users":8,"readings":7,"sessions":12,"unassigned":5,
"connections":3,"audits":21},"after":{ tudo 0 }}`. Nenhum paciente real tocado. 21 screenshots em
`qa/screenshots/` com os prefixos `t-14-` e `t-15-`.
