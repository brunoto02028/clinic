# QA — 106 T-6: a clínica marca como pago

**Data:** 29/09/2026
**Onde:** local, `npx next dev -p 4030`, worktree
`C:\Users\bruno\orca\workspaces\clinic\app_clinic`, banco local.
**Resultado geral:** ❌ **reprovado** — a rota faz tudo o que promete, e foi
medida linha a linha no banco. O que reprova está em volta dela: **a fatura e o
relatório registram o dinheiro como Stripe**, o desfazer **não tem botão**, e a
consulta paga **nunca diz como** foi paga. Três dos seis passos da tarefa.

**Qual checkout serve a porta, conferido antes de medir:**

```
:4030  -> PID 27404
          C:\Users\bruno\orca\workspaces\clinic\app_clinic\node_modules\next\...\start-server.js
:4000  -> C:\Users\bruno\Documents\clinic  (outro checkout — não medido)
```

**Pacientes de teste, nenhum real:**

| papel | quem | clínica |
|---|---|---|
| paciente | `Qa106 PacienteTeste` (`qa106.paciente@example.com`) | QA106 Clinica de Teste |
| admin | `Qa106 AdminTeste` (`qa106.admin@example.com`) | QA106 Clinica de Teste |
| terapeuta | `Qa106 TerapeutaTeste` (`qa106.terapeuta@example.com`) | QA106 Clinica de Teste |
| **outra clínica** | `Qa106b PacienteOutra` / `Qa106b AdminOutra` | **QA106B Outra Clinica** |

A segunda clínica foi criada para este QA, só para a parede de inquilino.

**Como medi:** cada ✅ abaixo tem a linha de `Payment` lida **direto no banco**,
não o que a tela mostrou. Os status HTTP são os exatos devolvidos pelo `curl`,
com `-w "HTTP %{http_code}"`.

## Resumo

| # | cenário | tipo | resultado |
|---|---|---|---|
| 6.1 | Transferência: `CONFIRMED` + `Payment` completo | UI+DB | ✅ |
| 6.2 | Dinheiro: idem, com `channel=CASH` | UI+DB | ✅ |
| 6.3 | sem cobrança: sem botões, e **409 `nothing_to_pay`** pela rota | UI+API+DB | ✅ |
| 6.4 | já paga: **409 `already_paid`**, sem segunda linha | API+DB | ✅ |
| 6.5 | desfazer: pagamento `FAILED`, consulta `PENDING` | API+DB | ✅ pela rota — ❌ **sem caminho na tela** |
| 6.6 | `DELETE` num pagamento da Stripe: **409 `stripe_payment`** | API+DB | ✅ |
| 6.7 | consulta de outra clínica: **404** | API | ✅ |
| 6.8 | terapeuta: **403**, nada criado | API+DB | ✅ |
| 6.9 | a fatura e o relatório contam esse dinheiro | API+DB | ❌ **contam como Stripe** |

Extras medidos: canal inválido → **400 `bad_channel`**; sem sessão → **401**.

---

## 6.1 — Transferência ✅

Consulta de £80,00, `PENDING`, 12/10 às 11:00. Botão **Transferência** clicado na
própria linha da agenda.

Lido no banco imediatamente depois:

```json
{
 "consulta": {
  "id": "cmumwmao1000bxz58a0lhhgi0",
  "status": "CONFIRMED",
  "price": 80
 },
 "pagamentos": [
  {
   "id": "cmumwp29r000pxz58eqllvtf0",
   "amount": 80,
   "status": "SUCCEEDED",
   "channel": "TRANSFER",
   "recordedById": "cmummnah30002xz0kmm68m1ad",
   "recordedAt": "2026-09-29T16:44:13.116Z",
   "userId": "cmummnahc0004xz0kkd41tg1c",
   "clinicId": "cmummnags0000xz0klhafqptq",
   "stripePaymentId": null,
   "stripeSessionId": null
  }
 ],
 "quantosPagamentos": 1
}
```

Os cinco pontos pedidos, um a um:

| exigência | medido |
|---|---|
| consulta vira `CONFIRMED` | ✅ era `PENDING` |
| existe uma linha em `Payment` | ✅ uma, e só uma |
| `channel=TRANSFER` | ✅ |
| `status=SUCCEEDED` | ✅ |
| `recordedById` preenchido | ✅ é o id do admin que clicou |
| `amount` **igual ao da consulta** | ✅ 80 = 80 |

E `recordedAt` gravado. O `clinicId` do pagamento é o da clínica de teste, não o
da consulta lido do corpo da requisição — o corpo só levava `{"channel":"TRANSFER"}`.

📷 `screenshots/t-6-linha-paga-com-botoes.png` (antes)
📷 `screenshots/t-6-transferencia-toast.png` (o aviso: "Pago e liberado — £80.00
por transferência. A consulta está confirmada.")

---

## 6.2 — Dinheiro ✅

Consulta de £80,00, `PENDING`, 12/10 às 12:00. Botão **Dinheiro** na linha.

```json
{
 "consulta": { "id": "cmumwmsp3000dxz58j8m48g9v", "status": "CONFIRMED", "price": 80 },
 "pagamentos": [
  { "id": "cmumwq8eo000rxz58sk6a86l7", "amount": 80, "status": "SUCCEEDED",
    "channel": "CASH", "recordedById": "cmummnah30002xz0kmm68m1ad",
    "recordedAt": "2026-09-29T16:45:07.726Z", "stripePaymentId": null }
 ],
 "quantosPagamentos": 1
}
```

Mesma tabela do 6.1, com `channel=CASH`. ✅

📷 `screenshots/t-6-dinheiro-toast.png`

---

## 6.3 — consulta sem cobrança ✅

Duas metades, e as duas foram medidas.

**Na tela.** Para isolar o preço como motivo, criei no banco uma consulta de
preço **0** e status **`PENDING`** — pelo caminho normal ela nasceria
`CONFIRMED`, e aí os botões sumiriam por dois motivos ao mesmo tempo.

| linha | status | preço | botões na linha |
|---|---|---|---|
| `QA106 T6 sem cobranca PENDENTE` | PENDING | **£0** | Confirm, Cancel, Send Invoice, Edit, Delete |
| `QA106 Consulta Paga` | PENDING | £80 | **Transferência, Dinheiro**, Confirm, Cancel, … |

Nenhum botão de pagamento na de preço zero. E a contagem fecha na página inteira:
**5 botões "Transferência"** para **5 consultas `PENDING` com preço** — nem uma a
mais.

📷 `screenshots/t-6-linha-sem-cobranca-sem-botoes.png`

**Pela rota, chamada direto:**

```
POST /api/admin/appointments/cmumwnxcy0001xzwsioiohb9x/payment  {"channel":"TRANSFER"}
{"error":"This appointment has no charge","code":"nothing_to_pay"}
HTTP 409
```

E o banco depois: `status: "PENDING"`, `price: 0`, `pagamentos: []`,
`quantosPagamentos: 0`. Nada criado, nada mudado.

---

## 6.4 — consulta já paga ✅

Segunda chamada na consulta das 11:00, que o 6.1 pagou por transferência — desta
vez pedindo `CASH`, para ver se ela sobrescreve:

```
POST /api/admin/appointments/cmumwmao1000bxz58a0lhhgi0/payment  {"channel":"CASH"}
{"error":"This appointment is already paid","code":"already_paid"}
HTTP 409
```

Banco depois: **1** pagamento, ainda `channel: "TRANSFER"`, mesmo `id`
(`cmumwp29r000pxz58eqllvtf0`), mesmo `recordedAt`. Nenhuma segunda linha, e o
canal não foi trocado por baixo.

---

## 6.5 — desfazer ✅ pela rota, ❌ na tela

**A rota faz exatamente o que a tarefa descreve.** `DELETE` no pagamento em
dinheiro das 12:00:

```
DELETE /api/admin/appointments/cmumwmsp3000dxz58j8m48g9v/payment
{"paid":false,"status":"PENDING"}
HTTP 200
```

Banco depois:

```json
{
 "consulta": { "status": "PENDING" },
 "pagamentos": [
  { "id": "cmumwq8eo000rxz58sk6a86l7",   // o MESMO id de antes
    "amount": 80, "status": "FAILED", "channel": "CASH",
    "recordedById": "cmummnah30002xz0kmm68m1ad",
    "createdAt": "2026-09-29T16:45:07.728Z",
    "updatedAt": "2026-09-29T16:45:47.649Z" }
 ],
 "quantosPagamentos": 1
}
```

O pagamento **virou `FAILED` e não sumiu** — mesmo id, `createdAt` preservado,
`recordedById` preservado, `updatedAt` novo. A consulta voltou a `PENDING`. ✅

**E a tela não tem por onde fazer isso.** Medido no DOM, com uma consulta já
paga na frente:

```
botões da linha paga : ["Complete", "Send Invoice", "Edit", "Delete"]
a página inteira cita "Desfazer" ou "Undo" : false
```

`Delete` ali apaga a **consulta**, não o pagamento — vai em
`/api/appointments/[id]` com `DELETE`, outra rota. E os botões Transferência e
Dinheiro só aparecem em `PENDING`, então depois de pagar não sobra nada que
chegue à rota de desfazer.

O passo 5 da tarefa diz: *"Desfazer: marcar como pago por engano tem de ter
volta, com registro."* A volta existe no servidor e **não existe para quem
clicou**. Para desfazer hoje é preciso um `curl`. Isto é a mesma espécie de coisa
que a T-3 corrigiu: um caminho que existe e ninguém vê é um caminho que não
existe.

---

## 6.6 — pagamento da Stripe não se desfaz por aqui ✅

Fixture: uma consulta `CONFIRMED` com `Payment` `SUCCEEDED`, `channel=STRIPE`,
com identificadores de cartão.

```
DELETE /api/admin/appointments/cmumwmstm000fxz58oq00qydf/payment
{"error":"Card payments are undone by refunding","code":"stripe_payment"}
HTTP 409
```

E **nada mudou** — a prova é o `updatedAt`, que qualquer escrita teria mexido:

| | antes | depois |
|---|---|---|
| `Payment.updatedAt` | 2026-09-29T16:45:58.989Z | **2026-09-29T16:45:58.989Z** |
| `Payment.status` | SUCCEEDED | SUCCEEDED |
| `Appointment.status` | CONFIRMED | CONFIRMED |

---

## 6.7 — a parede de inquilino: **404**, e não 403 ✅

Consulta `PENDING` de £50 da **QA106B Outra Clinica**, chamada pelo admin da
QA106 — sessão válida, papel ADMIN, clínica errada.

```
POST   /api/admin/appointments/cmumwn5dn000nxz5834gu1xbp/payment  {"channel":"TRANSFER"}
{"error":"Appointment not found"}
HTTP 404

DELETE /api/admin/appointments/cmumwn5dn000nxz5834gu1xbp/payment
{"error":"Appointment not found"}
HTTP 404
```

**Os dois verbos respondem 404.** Não 403, não 200, não 500. O status exato é
404 nas duas chamadas, e o corpo é o mesmo "Appointment not found" que uma
consulta inexistente devolveria — quem está do lado de fora não distingue "não
existe" de "não é sua".

Banco da clínica B depois: consulta ainda `PENDING`, `pagamentos: []`. Intacta.

---

## 6.8 — terapeuta não marca dinheiro ✅

Sessão do `Qa106 TerapeutaTeste`, consulta da **própria** clínica dele,
`PENDING`, £80:

```
POST /api/admin/appointments/cmumwmsxx000hxz584wp0fo8p/payment  {"channel":"TRANSFER"}
{"error":"Forbidden"}
HTTP 403
```

**403**, e não 404 — está certo: a consulta é da casa dele, o que falta é
permissão, e a resposta diz isso. Banco depois: `status: "PENDING"`,
`quantosPagamentos: 0`. Nada criado.

### Extras

```
canal inválido  POST {"channel":"CARD"}
                {"error":"channel must be TRANSFER or CASH","code":"bad_channel"}   HTTP 400

sem sessão      POST {"channel":"TRANSFER"}
                {"error":"Your session has expired. Sign in again.", ... }          HTTP 401
```

---

## 6.9 — a fatura conta o dinheiro, e conta errado ❌

**Medido, e é o achado principal deste relatório.**

Fatura emitida para a consulta das 11:00, a que o 6.1 pagou por **transferência
bancária**:

```
POST /api/admin/appointments/cmumwmao1000bxz58a0lhhgi0/invoice  {}
{"success":true,"invoiceNumber":"BPR-2026-000001",
 "patientInvoiceId":"cmumwsrvt000vxz58u7tugber",
 "autoPaidViaStripe":true}
HTTP 200
```

`autoPaidViaStripe: true` — para um pagamento que nunca tocou num cartão.

O que foi gravado:

```json
FATURA (PatientInvoice)
{ "invoiceNumber": "BPR-2026-000001",
  "status": "PAID", "total": 80,
  "paidAt": "2026-09-29T16:44:13.119Z",
  "paidAmount": 80,
  "paidMethod": "stripe" }          <-- era TRANSFER

LANÇAMENTO FINANCEIRO (FinancialEntry)
{ "type": "INCOME", "amount": 80,
  "description": "Invoice BPR-2026-000001 — Qa106 PacienteTeste",
  "paymentMethod": "STRIPE",        <-- era TRANSFER
  "stripePaymentIntentId": null }   <-- porque não há nenhum
```

**A boa notícia:** o passo 6 da tarefa — *"a fatura e o relatório passam a contar
esse dinheiro"* — acontece. A fatura nasce `PAID`, o `FinancialEntry` de £80
entra como receita, e o painel Financeiro enxerga o valor.

**A má:** os dois dizem **Stripe**. O `channel` que a T-6 acrescentou ao
`Payment` — a razão de a tarefa existir, nas palavras dela mesma, *"numa
conciliação bancária é o 'como' que importa"* — **não viaja** para a fatura nem
para o livro. Quem conciliar o extrato bancário no fim do mês vai procurar £80
no repasse da Stripe e não vai achar: o dinheiro entrou por transferência.

Onde está: `app/api/admin/appointments/[id]/invoice/route.ts` monta
`stripePayment` só com `payment.status === "SUCCEEDED"` e o valor batendo, sem
olhar `channel`; `lib/create-patient-invoice.ts` então grava `paidMethod:
"stripe"` e chama `createFinancialEntryForInvoice` com `paymentMethod: "STRIPE"`.
O código é anterior à T-6 — quando foi escrito, **todo** pagamento era da Stripe,
e a T-6 é exatamente o que deixou de ser verdade.

O mesmo vale para `CASH`.

---

## As outras duas falhas

### F2 — a consulta paga nunca diz **como** foi paga ❌

**Medido no DOM.** A linha da consulta das 11:00, depois de paga por
transferência:

```
Qa106 PacienteTeste | CONFIRMED | QA106 Consulta Paga | Mon 12 Oct | 11:00 | £80
```

E a página inteira: `/pago por transfer|paid by transfer|Paid by bank/` → **não
aparece em lugar nenhum**.

O passo 4 da tarefa é: *"A consulta passa a mostrar 'pago por transferência', e
não 'esperando o pagamento'."* Metade foi feita — "Esperando o pagamento" some,
porque o status virou `CONFIRMED`. A outra metade não: a linha fica igual a
qualquer consulta confirmada, e não há como saber, olhando a agenda, se aquela
foi paga por transferência, em dinheiro, pelo cartão, ou se alguém só clicou em
*Confirm*.

📷 `screenshots/t-6-linha-depois-de-pagar.png`

É a distinção que a própria tarefa abriu: *"Confirmar e receber são duas coisas."*
A tela voltou a mostrar uma só.

### F3 — desfazer não tem botão

Está medido no 6.5. Repito aqui porque é um passo inteiro da tarefa que não
chegou à tela.

---

## Observação

### O1 — o `upsert` deixa um `stripeSessionId` numa linha que diz `TRANSFER` ℹ️

**Medido.** A tarefa escolheu `upsert` de propósito, para que uma cobrança da
Stripe que nunca completou não vire um segundo registro. Testei esse caso:

1. `Payment` `PENDING`, `channel=STRIPE`, `stripeSessionId="cs_qa106_nunca_completou"`.
2. `POST {"channel":"TRANSFER","note":"QA106 conciliacao"}` → **HTTP 200**.
3. A linha resultante:

```json
{ "id": "cmumwrot30001xzswpcalt45p",   // a mesma de antes, como previsto
  "status": "SUCCEEDED", "channel": "TRANSFER", "amount": 80,
  "note": "QA106 conciliacao",
  "recordedById": "<o admin>",
  "stripeSessionId": "cs_qa106_nunca_completou" }   <-- ficou
```

Funcionou como a tarefa desenhou: um registro só, o pendente foi fechado. O que
fica é um pagamento marcado como transferência **carregando o identificador de
uma sessão de Checkout**. Se aquela sessão for concluída depois — o paciente
deixou a aba aberta e pagou —, o webhook encontra uma linha já `SUCCEEDED`, e
o dinheiro teria entrado duas vezes na conta sem que o banco de dados mostrasse
duas.

Não reproduzi o pagamento em dobro (exigiria a Stripe), então é observação e não
falha. Se for tratar, o barato é limpar `stripeSessionId`/`stripePaymentId` no
`update` do `upsert`.

---

## Testes automatizados

`__tests__/agenda/a-clinica-marca-como-pago.test.ts` — **passa**, 15 testes,
junto com as outras três suítes da atividade (4 suítes, 46 testes, verdes). Ela
mede comportamento com `prisma` mockado e `@jest-environment node`; não lê código
como texto (`readFileSync`: 0 ocorrências).

Vale notar o que ela **não** cobre, e que é onde este QA reprovou: ela testa a
rota, e as três falhas estão fora da rota — na fatura, na linha da agenda e na
ausência de botão. Uma suíte verde aqui não contradiz o veredito.

## Erros de console

Nenhum na tela servida por `:4030` — **0 erros e 0 avisos**, incluindo os cliques
em Transferência e Dinheiro.

## Segurança

Nenhum token, chave ou segredo aparece neste relatório. Os identificadores de
Stripe citados (`pi_qa106_fixture`, `cs_qa106_nunca_completou`) são fixtures
inventadas por este QA, não valores reais.

---

## Veredito

**Reprovado.** E não pela rota: `POST /api/admin/appointments/[id]/payment` é
sólida em tudo o que foi medido. Registra e libera no mesmo ato, com o valor da
consulta e não o do corpo; guarda quem e quando; recusa preço zero com 409
`nothing_to_pay`, consulta já paga com 409 `already_paid`, canal inválido com 400,
terapeuta com 403, sessão ausente com 401; responde **404** — e não 403 — para
consulta de outra clínica, nos dois verbos; e o desfazer deixa o pagamento
`FAILED` em vez de apagá-lo, com o `id` e o `createdAt` de sempre. Oito dos nove
cenários passam, todos com a linha de `Payment` lida no banco.

O que reprova são três passos da tarefa que não chegaram até onde importa:

| passo | o que a tarefa diz | o que medi |
|---|---|---|
| 4 | a consulta mostra "pago por transferência" | só para de dizer que espera; nunca diz como foi pago |
| 5 | desfazer tem de ter volta | tem, por `curl`; a tela não tem botão |
| 6 | a fatura e o relatório contam esse dinheiro | contam — como **Stripe**, com `stripePaymentIntentId: null` |

O passo 6 é o mais caro dos três, e é o que contradiz a razão declarada da
tarefa. `Payment.channel` foi criado porque *"numa conciliação bancária é o 'como'
que importa"* — e o "como" morre no `Payment`: não aparece na agenda, não entra na
fatura, não entra no livro. Hoje a clínica consegue registrar que o dinheiro
entrou; não consegue descobrir depois por onde.

**Falta medir em produção** depois do deploy, com o commit confirmado na lista de
deployments do Coolify — e lá, com a Stripe de verdade, vale medir o O1 antes de
confiar no `upsert` sobre cobrança pendente.
