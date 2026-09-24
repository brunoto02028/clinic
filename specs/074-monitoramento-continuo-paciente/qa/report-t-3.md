# QA Report — T-3: Limiares de pressão como `AutomationRule` (reteste)

**Data:** 2026-09-23 (primeira rodada) · **reteste de R1/R2:** 2026-09-23, mais tarde
**Resultado geral:** ✅ **APROVADO** — os nove cenários passaram e as duas ressalvas de interface
(R1 e R2) foram corrigidas pela sessão principal e **reverificadas**. As F1..F9 do QA anterior
estão todas corrigidas e comprovadas.

> **Atualização.** Este relatório teve duas rodadas. A primeira aprovou com ressalvas R1 (a recusa
> nascia fora da tela) e R2 (a recusa chegava em inglês num painel em português). As duas foram
> corrigidas e reverificadas — ver **"Reteste de R1 e R2"**, no fim. R4 e R5 seguem abertas, mas são
> de fora da T-3. Uma ressalva nova, **R6**, apareceu na regra `EXERCISE_BP_LIMITS` da T-11.

## Ambiente

| | |
|---|---|
| Worktree | `C:\Users\bruno\orca\workspaces\clinic\app_clinic` |
| Servidor | `http://localhost:4010`, `next dev` reiniciado por mim para capturar stdout |
| PID / caminho conferido | `node .../app_clinic/node_modules/next/dist/server/lib/start-server.js` (porta 4000 não estava escutando) |
| Banco | `postgresql://postgres:***@localhost:5432/bpr_clinic_local` (as outras duas `DATABASE_URL` do `.env` estão comentadas) |
| Log do servidor | stdout do `next dev` capturado em arquivo; e-mails saem por `[OUTBOUND-SINK]`, porque fora de produção o `outbound-guard` derruba e registra tudo |
| Clínica de teste | `QA BP T3` / `qa-bp-t3` — criada para este QA e **removida ao final** |
| Contas de teste | `admin+qa-bp-t3@bpr.clinic` (ADMIN), `admin+qa-bp-t3-patient@bpr.clinic` (PATIENT), `admin+qa-bp-t3-therapist@bpr.clinic` (THERAPIST) |
| HEAD | `b8fc0af7` |

**Nenhum paciente real foi tocado.** Toda leitura de pressão foi gravada no paciente fictício e as
17 leituras foram apagadas no fim.

### Aviso importante sobre a revisão testada

O worktree está sendo editado **em paralelo** pela sessão principal. Durante este QA chegaram a
`app/api/automation/rules/[code]/route.ts` e `app/api/patient/blood-pressure/route.ts` as mudanças
da **T-11** (`EXERCISE_BP_LIMITS`, `lib/automation/exercise-bp.ts`). Consequências:

- As evidências de API e ponta-a-ponta dos cenários 5–8 foram colhidas na revisão **anterior** à
  T-11, quando a rota de pressão ainda tinha `if (isAlert)` como único portão.
- A rota agora usa `if (isAlert || blocksTraining)`, o que poderia ter invalidado os casos
  "silenciosos". **Repeti os casos decisivos na revisão atual** (seção "Re-verificação") e as
  conclusões da T-3 continuam de pé — `EXERCISE_BP_LIMITS` bloqueia em 200/110, acima de qualquer
  leitura usada aqui.

---

## Resumo

| # | Cenário | Tipo | Resultado |
|---|---|---|---|
| 1 | Os quatro limiares aparecem, são editáveis, salvam e persistem após recarregar (EN e PT) | UI | ✅ |
| 2 | Salvar 500/300–600/400 → recusado, nada salvo | UI | ✅ (era ⚠️ R1; corrigido e reverificado) |
| 3 | Salvar crise ≤ alerta → recusado, nada salvo | UI | ✅ (era ⚠️ R1; corrigido e reverificado) |
| 4 | Preview mostra a leitura, não "missing activities" | UI | ✅ |
| 5 | `PATCH` fora de faixa → 400; válido → 200 + persistência | API | ✅ |
| 6 | `PATCH` sem sessão / como paciente / como terapeuta / `scope=global` | API | ✅ |
| 7 | Ponta a ponta: 155/96 só clínica, 195/130 clínica + paciente, 120/70 nada | API | ✅ |
| 8 | Cascata regra da clínica → regra global → `BP_DEFAULTS`, os três estados | API | ✅ |
| 9 | Com 150/95–190/125, 170/110 é "Stage 2 Hypertension" | Módulo | ✅ |
| — | Refactor não levou o Prisma para o browser | Build | ✅ |

---

## Estado de cada F1..F9

| # | O que era | Estado | Evidência |
|---|---|---|---|
| **F1** | Os quatro números renderizavam `disabled` | ✅ **corrigido** | `disabled:false, readOnly:false, type:"number"` nos quatro campos; editados e salvos pela tela — cenário 1 |
| **F2** | O `PATCH` não validava os limiares | ✅ **corrigido** | Quatro corpos inválidos → 400 com mensagem — cenário 5 |
| **F3** | 500/300–600/400 era aceito e engolia a crise em silêncio | ✅ **corrigido** | Recusado com `Systolic thresholds must be between 90 and 220 mmHg`; banco inalterado — cenários 2 e 5 |
| **F4** | `{systolic}` era recusado como placeholder desconhecido | ✅ **corrigido** | `{systolic}/{diastolic}/{classification}` aceitos na regra de PA; `{systolic}` ainda recusado na regra de aderência (lista por regra, não uma lista global) |
| **F5** | Preview dizia "On a patient with 130 missing activities" com `{systolic}` cru | ✅ **corrigido** | `On a reading of 180/120 mmHg: "Blood pressure 180/120 mmHg"` — cenário 4 |
| **F6** | Faltava dizer que `action`/`actionData`/`channels` só valem na T-4 | ✅ **corrigido** | Comentário presente em `prisma/seed-automation-rules.ts`, no bloco `BP_THRESHOLDS` |
| **F7** | Regra da clínica desligada caía direto na constante do código | ✅ **corrigido** | Três estados provados com leituras reais — cenário 8 |
| **F8** | `findFirst` sem `orderBy` podia escrever numa linha global que o motor não lê | ✅ **corrigido** | Com duas linhas globais, o seed consertou a **mais antiga**, que é a mesma que `getBpThresholds` lê |
| **F9** | Estágio 2 cravado em 140/90 enquanto o alerta se movia | ✅ **corrigido** | Ponto médio derivado das faixas da clínica — cenário 9 |

---

## Detalhes

### 1. Os quatro limiares: visíveis, editáveis, salvos e persistentes ✅

**Passos (EN):** login como `admin+qa-bp-t3@bpr.clinic` → `/admin/automation` → cartão
`BP_THRESHOLDS`.

Estado inicial (só a regra global semeada, sem override da clínica):

```
[
  { "label": "alertSystolic =",   "value": "130", "type": "number", "disabled": false, "readOnly": false },
  { "label": "alertDiastolic =",  "value": "80",  "type": "number", "disabled": false, "readOnly": false },
  { "label": "crisisSystolic =",  "value": "180", "type": "number", "disabled": false, "readOnly": false },
  { "label": "crisisDiastolic =", "value": "120", "type": "number", "disabled": false, "readOnly": false }
]
```

![quatro campos editáveis, EN](screenshots/t-3-en-campos-editaveis.png)

**Edição:** 145 / 92 / 185 / 122 → **Salvar**. A tela respondeu
`Saved. It applies on the next run.` e a etiqueta do cartão virou de `Default` para `This clinic`.

**Recarregando a página** (`?cachebust=1`, contexto de browser novo — o chunk velho já escondeu
edição nesta atividade):

```
fields:  alertSystolic=145  alertDiastolic=92  crisisSystolic=185  crisisDiastolic=122  (todos disabled:false)
source:  "This clinic"
preview: On a reading of 185/122 mmHg: "Blood pressure 185/122 mmHg"
```

![salvo e persistido](screenshots/t-3-en-salvo-e-persistido.png)

No banco:

```json
{ "clinicId": "cmueo008a0000xzyk1pej8u8g",
  "condition": { "alertSystolic": 145, "alertDiastolic": 92, "crisisSystolic": 185, "crisisDiastolic": 122 } }
```

**PT:** locale trocado para `pt-BR` e página recarregada. Painel traduzido —
`Regras da automação`, `Esta clínica`, `Dispara quando`, `Texto`, `Ligada`, `Salvar`,
`Voltar ao padrão`, `Numa leitura de 185/122 mmHg: "…"`. Os quatro campos continuam editáveis
(`disabled:false`).

![campos editáveis, PT](screenshots/t-3-pt-campos-editaveis.png)

**Veredito: APROVADO.** Era o critério de aceite principal e ele está cumprido nos dois idiomas.

---

### 2. Salvar 500/300 – 600/400 pela tela ⚠️

**Passos:** preencher os quatro campos com 500 / 300 / 600 / 400 → **Save**.

**Obtido:** a gravação foi **recusada**. A mensagem renderizada foi
`Systolic thresholds must be between 90 and 220 mmHg`, e o banco não mudou:

```
### DB after the UI save of 500/300-600/400 (expect: still only the global row)
[ { "clinicId": null, "condition": { "alertSystolic": 130, "alertDiastolic": 80,
                                     "crisisSystolic": 180, "crisisDiastolic": 120 } } ]
```

![mensagem de erro no topo do painel](screenshots/t-3-en-erro-fora-de-faixa-topo.png)

**Ressalva R1 — a mensagem sai fora da tela.** Ela é renderizada no topo do painel, acima do
primeiro cartão, e não junto do cartão que falhou. Medido no momento do clique:

```
messageText:       "Systolic thresholds must be between 90 and 220 mmHg"
messageInsideCard: false
messageRect.top:   234      (posição na página)
cardRect:          1029 -> 1516
pageScrollY:       539      viewportH: 1000
messageVisibleNow: false
```

Ou seja: o admin clica em Save, **nada muda na tela dele**, e os valores recusados continuam
escritos nos campos — o que se parece com um salvamento bem-sucedido.

![o que o admin vê depois do clique: nenhum erro](screenshots/t-3-en-erro-fora-da-tela-viewport.png)

**Veredito: APROVADO COM RESSALVA.** O que a F3 exigia está feito — o valor é recusado e nada é
gravado, o risco clínico acabou. Falta a mensagem chegar aos olhos de quem clicou.

---

### 3. Salvar crise ≤ alerta pela tela ⚠️

**Passos:** 170 / 110 (alerta) e 160 / 100 (crise) → **Save**.

**Obtido:** recusado, com
`The crisis threshold must be higher than the alert threshold, on both numbers`.
Banco conferido depois: continuava só a linha global 130/80–180/120.

![erro de crise abaixo do alerta](screenshots/t-3-en-erro-crise-abaixo-do-alerta.png)

**Veredito: APROVADO COM RESSALVA** — mesma R1 do cenário 2 quanto à posição da mensagem.

---

### 4. Preview do texto do alerta ✅

**Obtido**, no cartão `BP_THRESHOLDS`:

```
titleEn -> On a reading of 180/120 mmHg: "Blood pressure 180/120 mmHg"
titlePt -> On a reading of 180/120 mmHg: "Pressao arterial 180/120 mmHg"
```

Em PT: `Numa leitura de 185/122 mmHg: "…"`.

O preview **acompanha o par de crise em edição**: depois de salvar 185/122 ele passou a dizer
`On a reading of 185/122 mmHg`. Some a frase errada ("On a patient with 130 missing activities") e
somem as chaves cruas. O cartão de aderência continua com a frase dele
(`On a patient with 3 missing activities`), então a lista por regra não vazou de um cartão para o
outro.

**Veredito: APROVADO.**

---

### 5. `PATCH /api/automation/rules/BP_THRESHOLDS` ✅

Sessão de `admin+qa-bp-t3@bpr.clinic` via `/api/auth/callback/credentials`.

```
### 5a: out of range 500/300 -> 600/400
{"error":"Systolic thresholds must be between 90 and 220 mmHg"}
HTTP 400

### 5b: systolic just over max (221)
{"error":"Systolic thresholds must be between 90 and 220 mmHg"}
HTTP 400

### 5c: diastolic under min (49)
{"error":"Diastolic thresholds must be between 50 and 140 mmHg"}
HTTP 400

### 5d: crisis <= alert
{"error":"The crisis threshold must be higher than the alert threshold, on both numbers"}
HTTP 400
```

Depois das quatro recusas, o banco tinha **só** a linha global intacta (130/80–180/120).

Valor válido:

```
### 5e: valid 150/95 alert, 190/125 crisis (clinic scope)
{"rule":{"id":"cmueo1mtc0007xz44jq4o7ldm","clinicId":"cmueo008a0000xzyk1pej8u8g",
  "code":"BP_THRESHOLDS", ...
  "condition":{"alertSystolic":150,"alertDiastolic":95,"crisisSystolic":190,"crisisDiastolic":125},
  ...},"created":true}
HTTP 200
```

E a leitura do banco confirmou as duas linhas (global 130/80 + override da clínica 150/95).

**Placeholders (F4):**

```
### F4a: BP rule accepts {systolic} {diastolic} {classification}   -> HTTP 200
### F4b: BP rule refuses an unknown placeholder
{"error":"Unknown placeholder: {sistolica}. Available: {missingItems}, {systolic}, {diastolic}, {classification}"}
HTTP 400
### F4c: the adherence rule still refuses {systolic}
{"error":"Unknown placeholder: {systolic}. Available: {missingItems}"}
HTTP 400
### F4d: the adherence rule still accepts {missingItems}           -> HTTP 200
```

**Veredito: APROVADO.**

---

### 6. Quem pode editar a regra ✅

```
### 6a: no session
/login?callbackUrl=%2Fapi%2Fautomation%2Frules%2FBP_THRESHOLDS
HTTP 307                                  <- barrado no middleware, nada gravado

### 6b: patient session
{"error":"Staff only"}
HTTP 403

### 6c: therapist session (staff, but not admin)
{"error":"Only an administrator can change a rule"}
HTTP 403

### 6d: clinic ADMIN trying scope=global
{"error":"Only the platform owner can change the default for every clinic"}
HTTP 403
```

**Veredito: APROVADO.** O paciente e o terapeuta não editam, e um ADMIN de clínica não consegue
mover o padrão de todas as outras.

---

### 7. Ponta a ponta com o limiar da clínica em 150/95 – 190/125 ✅

Override da clínica gravado via API. Leituras enviadas pelo paciente de teste em
`POST /api/patient/blood-pressure`, todas HTTP 200. O que saiu (ou não saiu) veio do log do
servidor — fora de produção o `outbound-guard` derruba e registra cada mensagem.

**(a) 155/96 — acima do alerta, abaixo da crise:**

```
 POST /api/patient/blood-pressure 200 in 738ms
[OUTBOUND-SINK] email -> admin+qa-bp-t3-clinic@bpr.clinic: High Blood Pressure Reading: QA PatientT3 — 155/96 mmHg
```

Uma única mensagem, para o endereço de avisos da clínica. **Nada para o paciente** — como manda a
regra de nunca escrever ao paciente por conta própria.

**(b) 195/130 — crise:**

```
[OUTBOUND-SINK] email -> admin+qa-bp-t3-clinic@bpr.clinic: HYPERTENSIVE CRISIS: QA PatientT3 — 195/130 mmHg
 POST /api/patient/blood-pressure 200 in 64ms
[OUTBOUND-SINK] email -> admin+qa-bp-t3-patient@bpr.clinic, admin+qa-bp-t3-clinic@bpr.clinic: Blood Pressure Alert — QA
[email-templates] "BP_HIGH_ALERT" to admin+qa-bp-t3-patient@bpr.clinic was dropped by the outbound guard — not filed as sent
```

Clínica **e** paciente, este último pelo template `BP_HIGH_ALERT`.

**(c) 120/70 e (d) 145/92:**

```
  POST 120/70 -> HTTP 200
  POST 145/92 -> HTTP 200
--- log since mark (expect: two POST 200 lines, ZERO outbound-sink) ---
 POST /api/patient/blood-pressure 200 in 52ms
 POST /api/patient/blood-pressure 200 in 58ms
```

Silêncio total. **145/92 é o caso decisivo**: com os números antigos cravados na rota (130/80) ele
teria disparado; com a regra da clínica em 150/95 ele não dispara. É a prova de que a rota lê a
regra, e não mais as constantes.

**Veredito: APROVADO.**

---

### 8. A cascata: regra da clínica → regra global → `BP_DEFAULTS` ✅

Para os três estados serem distinguíveis, a regra **global** foi posta em 140/90–185/122 — diferente
tanto do override da clínica (150/95–190/125) quanto da constante do código (130/80–180/120).

**Estado A — override da clínica ligado:**

```
  POST 145/92 -> HTTP 200      (silêncio: abaixo de 150/95, embora acima do global 140/90)
  POST 152/96 -> HTTP 200
[OUTBOUND-SINK] ... High Blood Pressure Reading: QA PatientT3 — 152/96 mmHg
```

A da clínica vence a global.

**Estado B — override da clínica `active:false`:**

```
clinic rule active=false: 1
  POST 135/85 -> HTTP 200      (silêncio: abaixo do global 140/90; teria alertado na constante 130/80)
  POST 142/91 -> HTTP 200
[OUTBOUND-SINK] ... High Blood Pressure Reading: QA PatientT3 — 142/91 mmHg
```

Cai na **global**, não na constante — que é exatamente a F7.

**Estado C — linha global apagada, override ainda desligado:**

```
STATE: [{"clinicId":"cmueo008a...","active":false,"condition":{...150/95...}}]
  POST 128/78  -> HTTP 200     (silêncio)
  POST 135/85  -> HTTP 200     <- alertou agora; estava em silêncio no estado B
  POST 182/121 -> HTTP 200
[OUTBOUND-SINK] ... High Blood Pressure Reading: QA PatientT3 — 135/85 mmHg
[OUTBOUND-SINK] ... HYPERTENSIVE CRISIS: QA PatientT3 — 182/121 mmHg
[OUTBOUND-SINK] email -> admin+qa-bp-t3-patient@bpr.clinic, ...: Blood Pressure Alert — QA
```

Cai em 130/80–180/120. O par 135/85 alternando entre silêncio (estado B) e alerta (estado C) é o
que separa "caiu na global" de "caiu na constante". E 182/121 vira crise só no estado C, porque a
crise global era 185/122.

Isto também cobre os cenários **3.1, 3.2 e 3.3** da `qa-spec.md`.

**F8 — linha global duplicada.** Criei uma segunda linha global (mais nova, 111/71–199/131),
estraguei a mais antiga para 999/999 e rodei `prisma/seed-automation-rules.ts`:

```
GLOBAL ROWS after the seed (oldest first):
 [0] OLDEST cmuenwb520002xzgweg69dae0  {"alertSystolic":130,...,"crisisDiastolic":120}  "Blood pressure — when to alert the clinic and"
 [1] newer  cmueokxth0001xzjkcmtcng6c  {"alertSystolic":111,...,"crisisDiastolic":131}  "DUPLICATE global row (QA F8)"

PASS: the seed repaired the OLDEST row (the one getBpThresholds/loadRules read).
```

E o leitor concorda com o escritor:

```
clinic override OFF, two global rows present (oldest 130/80, duplicate 111/71)
getBpThresholds returned: {"alertSystolic":130,"alertDiastolic":80,"crisisSystolic":180,"crisisDiastolic":120}
PASS: the reader picked the OLDEST global row — same row the seed writes.
```

**Veredito: APROVADO.**

---

### 9. Classificação derivada das faixas da própria clínica ✅

`getBpThresholds` + `classify` — o mesmo par que a rota de pressão chama — executados contra o banco
real, com o override da clínica em 150/95–190/125:

```
thresholds in force for the QA clinic: {"alertSystolic":150,"alertDiastolic":95,"crisisSystolic":190,"crisisDiastolic":125}
derived stage-2 midpoint: 170/110
170/110  isAlert=true  isCrisis=false -> "Stage 2 Hypertension"   OK   the prompt's case: exactly the midpoint of this clinic's own bands
169/109  isAlert=true  isCrisis=false -> "Stage 1 Hypertension"   OK   one below the midpoint
155/ 96  isAlert=true  isCrisis=false -> "Stage 1 Hypertension"   OK   DISCRIMINATING: old hardcoded 140/90 would have called this Stage 2
145/ 92  isAlert=false isCrisis=false -> "(not an alert)"   OK   below this clinic's alert band
195/130  isAlert=true  isCrisis=true  -> "Hypertensive Crisis"   OK
```

170/110 é "Stage 2 Hypertension" porque é o meio das faixas **desta** clínica. O caso que separa o
código novo do antigo é **155/96**: o 140/90 cravado teria chamado de Estágio 2; agora é Estágio 1,
que é o que as faixas da clínica dizem.

**Veredito: APROVADO.**

---

### Refactor: o Prisma não foi para o browser ✅

`npm run build` com `NEXT_DIST_DIR` separado, para não atropelar o `.next` do servidor de dev.
Exit code 0 nas duas execuções.

| Build | `/admin/automation` | First Load JS |
|---|---|---|
| **Antes** (`rules-panel.tsx` em `HEAD`, sem `bp-bands`) | 9.01 kB | 145 kB |
| **Depois** (versão da T-3) | 9.42 kB | 145 kB |

Diferença: **+0,41 kB**. Nada perto dos "100+ kB" que denunciariam o Prisma no bundle. O chunk
compartilhado é idêntico (89,3 kB) nos dois.

Prova direta, procurando o Prisma nos chunks de cliente:

```
### which client chunks carry the BP band code
static/chunks/app/admin/automation/page-aac20682b3784aa1.js

### and do those chunks mention prisma at all?
static/chunks/app/admin/automation/page-aac20682b3784aa1.js: 0 prisma hits, 16156 bytes
```

O corte `bp-bands.ts` (puro) / `bp-thresholds.ts` (com Prisma) fez o que se propunha.

**Veredito: APROVADO.**

---

### Re-verificação na revisão atual (depois da chegada da T-11)

A rota de pressão passou a ter `if (isAlert || blocksTraining)`. Repeti os casos decisivos — o dev
server recompilou a rota — com o override da clínica em 145/92–185/122 e `EXERCISE_BP_LIMITS`
global em 200/110:

```
  POST 120/70  -> HTTP 200
  POST 144/91  -> HTTP 200
  POST 146/93  -> HTTP 200
  POST 186/123 -> HTTP 200
--- log ---
 Compiled /api/patient/blood-pressure in 361ms (1535 modules)
 POST /api/patient/blood-pressure 200 in 518ms
 POST /api/patient/blood-pressure 200 in 75ms
 POST /api/patient/blood-pressure 200 in 50ms
[OUTBOUND-SINK] email -> admin+qa-bp-t3-clinic@bpr.clinic: High Blood Pressure Reading: QA PatientT3 — 146/93 mmHg
[OUTBOUND-SINK] email -> admin+qa-bp-t3-clinic@bpr.clinic: HYPERTENSIVE CRISIS: QA PatientT3 — 186/123 mmHg
 POST /api/patient/blood-pressure 200 in 53ms
[OUTBOUND-SINK] email -> admin+qa-bp-t3-patient@bpr.clinic, admin+qa-bp-t3-clinic@bpr.clinic: Blood Pressure Alert — QA
```

120/70 e 144/91 em silêncio, 146/93 só para a clínica, 186/123 para clínica e paciente. As
conclusões da T-3 continuam valendo no código de agora.

---

## Erros de console

`/admin/automation` recarregada em contexto novo: **0 erros e 0 avisos**.

Durante o QA o console registrou quatro
`Failed to load resource: the server responded with a status of 400 (Bad Request) @ /api/automation/rules/BP_THRESHOLDS`
— são exatamente as gravações inválidas que eu mandei de propósito nos cenários 2 e 3. Nenhuma
exceção de JavaScript partiu do painel.

---

## Falhas e recomendações

### R1 — a mensagem de erro do painel nasce fora da tela ✅ **RESOLVIDA** (ver "Reteste de R1 e R2")

**O que acontece:** a mensagem é única e fica no topo do painel
(`components/automation/rules-panel.tsx`, o `message` logo abaixo do cabeçalho). O cartão de PA é o
terceiro da lista. Quem clica em Save no cartão de PA está a ~795 px abaixo da mensagem: o clique
não muda nada visível, e os números recusados seguem escritos nos campos.

**Por que importa:** não é risco clínico — o valor é recusado e o limiar em vigor não muda. É risco
de confiança: o admin sai da tela achando que configurou 500/300 quando não configurou nada.

**Onde olhar:** `components/automation/rules-panel.tsx`. Duas saídas simples — guardar o erro por
`code` e renderizá-lo dentro do cartão, ao lado do botão Save; ou usar o toaster que a página já
tem montado.

### R2 — em português, o erro chega em inglês ✅ **RESOLVIDA** (ver "Reteste de R1 e R2")

Com a tela em `pt-BR`, a recusa ainda aparece como
`Systolic thresholds must be between 90 and 220 mmHg`. As mensagens nascem em
`lib/automation/bp-bands.ts` (`bpThresholdProblem`) e voltam cruas da API; o `UI` do painel traduz
só as strings dele.

![painel em PT com erro em inglês](screenshots/t-3-pt-erro-em-ingles.png)

Colide com a regra de bilinguismo da `qa-spec` ("Nenhuma string no idioma errado"). Sugestão:
devolver um **código** de problema em vez de frase pronta e traduzir no painel, mantendo a frase em
inglês como fallback da API.

### R3 — o `name` da regra não é bilíngue (pré-existente, fora da T-3)

Em PT o cartão continua mostrando
`Blood pressure — when to alert the clinic and when it is a crisis`. Vale para as regras de
aderência também (`Alert the therapist — three or more activities missed today`), então é
comportamento antigo do painel, não algo que a T-3 trouxe. Só registrando.

### R4 — `/admin/reminder-templates` leva o Prisma para o browser (fora da T-3)

Encontrado no build, enquanto eu conferia o bundle da T-3. É **exatamente o erro que a T-3 evitou**,
vivo na aba vizinha da mesma tela:

```
app/admin/reminder-templates/page.tsx:1   "use client";
app/admin/reminder-templates/page.tsx:12  import { ... } from "@/lib/reminder-templates";
lib/reminder-templates.ts:1               import { prisma } from "@/lib/db";
```

O resultado no bundle de cliente:

```
static/chunks/app/admin/reminder-templates/page-841027afda737c57.js:
  let g=globalThis,y=g.prisma??new b.PrismaClient({log:["warn","error"],datasources:{db:{...
static/chunks/3985-0763615ec362c2a2.js  (145 KB)
  c.prismaVersion={client:"6.7.0",...}  PrismaClientKnownRequestError is unable to run in this browser env...
```

| Rota | Route JS | First Load JS |
|---|---|---|
| `/admin/automation` (T-3) | 9.42 kB | 145 kB |
| `/admin/reminder-templates` | 43.1 kB | 188 kB |

Não conserto nada fora do escopo — fica o aviso. O caminho é o mesmo da T-3: separar de
`lib/reminder-templates.ts` a parte pura (os `REMINDER_TEMPLATE_TOKENS` e os tipos) da parte que
toca o Prisma.

### R5 — o bundler do mobile está com erro de sintaxe (fora da T-3)

No console apareceu, vindo do Expo em `192.168.1.192:8083` (outra aba, não desta tela):

```
Error: TransformError SyntaxError: mobile/app/(app)/(clinica)/messages.tsx: Unexpected token, expected "," (120:25)
  120 |   <LoadFailure error={messagesError} onRetry={() => refetch()} />
```

Nada a ver com a T-3, mas o bundle do mobile não está compilando.

---

## Limpeza

| Item | Estado final |
|---|---|
| 17 leituras de pressão do paciente de teste | apagadas |
| 2 overrides de regra da clínica de teste (`BP_THRESHOLDS`, `ADHERENCE_DAILY_ALERT`) | apagados |
| 3 usuários de teste | apagados |
| Clínica `qa-bp-t3` | apagada |
| Linha global duplicada da F8 | apagada |
| Regra global `BP_THRESHOLDS` | **restaurada no padrão semeado** 130/80–180/120, `active:true` |
| `public/version.json` (mexido pelo `npm run build`) | restaurado com `git checkout` |
| Diretórios de build temporários | removidos |
| `components/automation/rules-panel.tsx` (trocado pela versão de `HEAD` para medir o baseline) | restaurado, `diff` idêntico ao backup |

Conferência final:

```
BP_THRESHOLDS rows: [ { "clinicId": null, "active": true,
  "condition": { "alertSystolic": 130, "alertDiastolic": 80,
                 "crisisSystolic": 180, "crisisDiastolic": 120 } } ]
{ leftoverUsers: 0, leftoverClinic: 0, leftoverReads: 0 }
```

---

## Veredito final

⚠️ **APROVADO COM RESSALVAS.**

As nove F do QA anterior estão corrigidas e cada uma tem evidência. O que reprovou da última vez —
500/300–600/400 aceito e engolindo uma crise real de 195/130 em silêncio — está resolvido na API e
na tela, e o banco fica intacto quando a gravação é recusada. Os quatro campos são editáveis,
salvam, persistem e valem sem deploy, nos dois idiomas. A cascata clínica → global → constante está
provada nos três estados, com leituras de verdade. O refactor entregou o que prometia: +0,41 kB na
rota e zero Prisma no bundle do browser.

Faltam duas coisas de interface, nenhuma delas de risco clínico: **R1** (a mensagem de erro nasce
fora da tela de quem clicou) e **R2** (a recusa chega em inglês num painel em português). Sugiro
resolver R1 antes de fechar a tarefa — uma recusa que ninguém vê é quase uma aceitação — e tratar
R2 junto, já que as duas mexem no mesmo componente.

---

# Reteste de R1 e R2

**Data:** 2026-09-23, depois da correção da sessão principal
**Escopo:** só R1 e R2, mais uma passada de confirmação na regra `EXERCISE_BP_LIMITS` (T-11).
Os nove cenários da primeira rodada **não** foram refeitos.
**Resultado:** ✅ **as duas ressalvas estão resolvidas.** Uma ressalva nova, **R6**, apareceu na
regra da T-11.

**Ambiente:** mesmo servidor (`localhost:4010`, PID 27364, este worktree). Clínica de teste própria
e nova, `QA BP T3 retest` / `qa-bp-t3r`, com `admin+qa-bp-t3r@bpr.clinic` — nenhuma clínica de outro
agente foi tocada. Tudo removido ao final.

## Antes de mais nada: o chunk velho quase reprovou a correção

Na primeira tentativa a recusa ainda apareceu **no topo do painel, com a classe antiga**
(`text-sm text-foreground bg-muted/40 …`), sem `role="alert"` e sem
`data-testid="rule-error-BP_THRESHOLDS"` em lugar nenhum do DOM. O log do servidor mostrou o
`load()` rodando depois do 400 — o comportamento antigo:

```
PATCH /api/automation/rules/BP_THRESHOLDS 400 in 1041ms
GET /admin/automation?_rsc=1ot9q 200 in 125ms
GET /api/automation/rules 200 in 99ms          <- o reload que a correção removeu
```

Não era o código: era o **chunk em cache**. O dev server serve o bundle da rota numa URL fixa e sem
hash, com validade de um ano:

```
GET /_next/static/chunks/app/admin/automation/page.js
Cache-Control: public, max-age=31536000, immutable
```

Buscando esse mesmo arquivo direto do servidor, a correção estava lá:

```
  rule-error-    1 hits
  ruleError      1 hits
  errorPt        1 hits
```

Forcei o browser a rebaixar o arquivo (`fetch(url, { cache: 'reload' })` em cada `<script src>`) e
recarreguei. **Toda a evidência abaixo é da execução com o chunk novo.** Fica o registro: nesta tela
um reload comum não basta para ver uma edição.

## 1. EN — recusa dentro do cartão, visível a partir do clique ✅

500 / 300 / 600 / 400 em `BP_THRESHOLDS` → **Save**. Medido logo após o clique, sem rolar a página,
do mesmo jeito que na primeira rodada:

```
role:                           "alert"
messageText:                    "Systolic thresholds must be between 90 and 220 mmHg"
messageInsideCard:              true
messageRect:                    { top: 1402, bottom: 1439 }
cardRect:                       { top: 967,  bottom: 1507 }
saveButtonTop:                  1455
pxBetweenMessageAndSaveButton:  16
pageScrollY:                    919
viewportH:                      1000
messageVisibleNow:              true
panelLevelMessages:             []          <- nada mais no topo
errorOnTheOtherCard:            false
```

Lado a lado com a primeira rodada:

| | Antes | Agora |
|---|---|---|
| `messageInsideCard` | `false` | **`true`** |
| Distância até o botão Save | ~795 px acima, fora da tela | **16 px acima, logo ali** |
| `messageVisibleNow` no clique | **`false`** | **`true`** |
| `role="alert"` | não tinha | **tem** |
| Mensagem no topo do painel | sim | não |

![erro dentro do cartão, EN](screenshots/t-3-r1-en-erro-dentro-do-cartao-viewport.png)

A captura é do viewport no momento do clique, sem rolagem: a caixa vermelha está entre o campo
`priority` e o botão Save, e os 500/300/600/400 continuam nos campos.

## 2. PT — recusa em português ✅

Mesma tentativa com a tela em `pt-BR`:

```
messageText:      "Os limiares de sistólica têm de ficar entre 90 e 220 mmHg"
isPortuguese:     true
anyEnglishLeft:   false
messageInsideCard: true
messageVisibleNow: true
pxBetweenMessageAndSaveButton: 16
```

É exatamente a frase que a correção prometeu. Nenhuma palavra em inglês sobrou na mensagem.

![erro em português](screenshots/t-3-r2-pt-erro-em-portugues.png)

## 3. Os valores recusados continuam nos campos ✅

Depois da recusa, sem tocar em nada:

```
fieldsStillHoldRejectedValues:
  alertSystolic   = "500"
  alertDiastolic  = "300"
  crisisSystolic  = "600"
  crisisDiastolic = "400"
```

Vale nos dois idiomas. O `load()` não roda mais na recusa, então o que o admin digitou fica lá para
ser corrigido — era o outro lado do problema que a R1 escondia. (Num **reload** de verdade da página
os valores não salvos somem, como deve ser.)

## 4. Um save válido continua funcionando ✅

150 / 95 / 190 / 125 → **Save**:

```
errorClearedFromCard:  true                              <- a caixa vermelha some
successText:           "Saved. It applies on the next run."
successInsideCard:     false
successPageTop:        234        (cardTop: 1029)        <- sucesso segue no topo do painel
sourceBadge:           "This clinic"
```

E no banco:

```
BP_THRESHOLDS        global  {"alertSystolic":130,"alertDiastolic":80,"crisisSystolic":180,"crisisDiastolic":120}
BP_THRESHOLDS        CLINIC  {"alertSystolic":150,"alertDiastolic":95,"crisisSystolic":190,"crisisDiastolic":125}
```

A mensagem de sucesso continuar no topo é coerente: ela fala do painel, e a tela recarrega quando
ela aparece. A de erro é que precisava ficar junto do cartão.

## 5. O banco segue intacto depois da recusa ✅

Conferido logo após a recusa em EN, antes de qualquer save válido:

```
### DB after the EN refusal (expect: only global rows, untouched, no clinic override)
BP_THRESHOLDS        global  {"alertSystolic":130,"alertDiastolic":80,"crisisSystolic":180,"crisisDiastolic":120}
EXERCISE_BP_LIMITS   global  {"stopSystolic":250,"blockSystolic":200,"stopDiastolic":115,"blockDiastolic":110}
```

Nenhuma linha de clínica criada, nenhuma global mexida.

---

## De passagem: a regra `EXERCISE_BP_LIMITS` (T-11)

### (a) Os quatro campos são editáveis e salvam ✅

Aparecem como `stopSystolic / blockSystolic / stopDiastolic / blockDiastolic`, todos
`type="number"`, `disabled:false`. Salvei 190/105 (bloqueio) e 240/130 (interrupção) pela tela e a
linha foi criada:

```
EXERCISE_BP_LIMITS   CLINIC  {"stopSystolic":240,"blockSystolic":190,"stopDiastolic":130,"blockDiastolic":105}
```

### (b) 600/400 é recusado, com mensagem própria, nos dois idiomas ✅

```
EN: "The blocking limit must be between 140/80 and 240/140 mmHg"
PT: "O limite de bloqueio tem de ficar entre 140/80 e 240/140 mmHg"

insideItsOwnCard:        true
visibleNow:              true
pxAboveSave:             16
differsFromBpMessage:    true      <- não é a frase da BP_THRESHOLDS
```

Com as duas regras recusadas ao mesmo tempo, cada cartão exibiu **a sua própria** frase:

```
exerciseError:     "O limite de bloqueio tem de ficar entre 140/80 e 240/140 mmHg"
bpCardErrorText:   "Os limiares de sistólica têm de ficar entre 90 e 220 mmHg"
```

![erro próprio da EXERCISE_BP_LIMITS](screenshots/t-3-r1-en-exercise-erro-proprio.png)

### (c) Uma não mexe na outra ✅

Era o risco de confusão que a spec registrou. Testei nos dois sentidos.

Salvando `EXERCISE_BP_LIMITS` (190/105 – 240/130), com a `BP_THRESHOLDS` já em 150/95 – 190/125:

```
BP_THRESHOLDS        CLINIC  {"alertSystolic":150,"alertDiastolic":95,"crisisSystolic":190,"crisisDiastolic":125}   <- intacta
EXERCISE_BP_LIMITS   CLINIC  {"stopSystolic":240,"blockSystolic":190,"stopDiastolic":130,"blockDiastolic":105}      <- nova
```

Depois, salvando `BP_THRESHOLDS` (138/88 – 178/118):

```
BP_THRESHOLDS        CLINIC  {"alertSystolic":138,"alertDiastolic":88,"crisisSystolic":178,"crisisDiastolic":118}   <- mudou
EXERCISE_BP_LIMITS   CLINIC  {"stopSystolic":240,"blockSystolic":190,"stopDiastolic":130,"blockDiastolic":105}      <- intacta
```

As duas regras são independentes no banco e na tela.

### R6 — o preview da `EXERCISE_BP_LIMITS` é o bug da F5, de novo ⚠️ (novo, T-11)

O cartão da regra nova mostra, nos dois idiomas:

```
On a patient with 1 missing activities: “Session blocked — blood pressure {systolic}/{diastolic} mmHg”
On a patient with 1 missing activities: “Sessao bloqueada — pressao {systolic}/{diastolic} mmHg”
```

Em PT: `Num paciente com 1 atividades não feitas: "…"`.

É exatamente a **F5** que a T-3 consertou, ressurgida na regra da T-11: frase de outra regra
("missing activities", numa regra que fala de pressão antes do treino) e os placeholders
`{systolic}`/`{diastolic}` crus, que é o que o terapeuta vai ler.

A causa está em `sampleFor()` (`components/automation/rules-panel.tsx`): ela só trata
`BP_THRESHOLD_RULE`, e qualquer outro código cai no ramo de aderência. O conserto é o mesmo padrão
já usado para a de pressão — um ramo para `EXERCISE_BP_RULE` usando o par de bloqueio e
`ui.previewWithBp`.

Visível na captura da seção (b), acima.

**Não é da T-3** — é da T-11, e o painel a herdou. Fica registrada aqui porque foi encontrada
reverificando a T-3, e porque a validação de placeholder da rota **já aceita** `{systolic}` e
`{diastolic}` em `EXERCISE_BP_LIMITS` (`FACTS_BY_RULE`), então só o preview está fora de passo.

---

## Erros de console (reteste)

Dois, os dois deliberados: `400 (Bad Request) @ /api/automation/rules/EXERCISE_BP_LIMITS`, das
gravações inválidas que eu mesmo mandei. Nenhuma exceção de JavaScript.

## Limpeza (reteste)

| Item | Estado final |
|---|---|
| 2 overrides da clínica de teste (`BP_THRESHOLDS`, `EXERCISE_BP_LIMITS`) | apagados |
| Usuário `admin+qa-bp-t3r@bpr.clinic` | apagado |
| Clínica `qa-bp-t3r` | apagada |
| Regra global `BP_THRESHOLDS` | intacta no padrão 130/80–180/120, `active:true` |
| Regra global `EXERCISE_BP_LIMITS` | intacta no padrão 200/110–250/115, `active:true` |

```
leftover qa-bp-t3r users: 0
leftover qa-bp-t3r clinic: 0
```

## Veredito do reteste

✅ **R1 e R2 resolvidas.** A recusa agora nasce dentro do cartão da regra, 16 px acima do botão que
a pessoa acabou de clicar, dentro do viewport, com `role="alert"`, e em português quando a tela está
em português. Os valores recusados ficam nos campos para serem corrigidos, o save válido continua
funcionando com a mensagem de sucesso no topo, e o banco não é tocado numa recusa.

A regra `EXERCISE_BP_LIMITS` da T-11 passa em (a), (b) e (c) — campos editáveis, recusa com mensagem
própria e bilíngue, e nenhuma interferência entre as duas regras. Só o **preview** dela está errado
(**R6**), e isso é da T-11.

**Com isto a T-3 fica APROVADA.** R4 (`/admin/reminder-templates` levando o Prisma para o browser),
R5 (bundle do mobile sem compilar) e R6 (preview da `EXERCISE_BP_LIMITS`) seguem abertas e são todas
de fora da T-3.
