# QA Report — T-3 + T-4: o código no app e o resgate no checkout

**Data:** 26/09/2026
**Worktree:** `C:\Users\bruno\orca\workspaces\clinic\app_clinic` · branch `brunoto02028/app_clinic`
**HEAD:** `db1290d3` (o cupom está no working tree, ainda não commitado)
**Servidor medido:** `http://localhost:4100` — confirmado como **este** checkout antes de medir
(PID 18560 → pai 49936 → `node .../orca/workspaces/clinic/app_clinic/node_modules/.bin/next dev -p 4100`).
**Banco:** `postgresql://postgres:***@localhost:5432/bpr_clinic_local`. Nenhum `db push`, `migrate`
ou DDL. Só inserção/atualização/remoção de **linhas minhas**. Produção e `bpr.clinic` intocados.
Nenhuma chamada saiu para a Stripe (a chave está comentada no `.env`; no harness ela é um gravador).

**Resultado geral: ❌ reprovado.** 19 cenários do qa-spec: **10 aprovados**, **1 reprovado**,
**2 aprovados com ressalva**, **5 não executados na tela** (o alvo web do Expo não sobe — motivo
abaixo, com screenshot), **1 não aplicável**. O par T-3+T-4 não pode ir para produção por **F-2**
(cupom de 100% quebra a venda) e **F-1** (a tela promete mensalidade descontada para sempre).

> Os dois defeitos que reprovam já estavam no `review-084.md` (A-2 e A-3), escrito em paralelo por
> leitura de código. Este relatório os **reproduz em execução**, com as rotas reais e o banco real —
> e acrescenta a confirmação em runtime de A-1 (o toque duplo no padrão `maxPerPatient: 1`).

---

## Como foi testado

Quatro execuções independentes, todas coladas abaixo.

1. **HTTP real contra `:4100`** — `curl` com token mobile do paciente de teste. Cobre a prévia
   inteira (T-3) e o caminho de falha do checkout no servidor de verdade.
2. **Harness do QA** (`qa/harness-t-3-t-4.test.ts.txt`) — as **rotas reais** (`preview`,
   `appointments/[id]/checkout`, `packages/checkout`, `treatment-plans/checkout`,
   `membership/subscribe`) executadas contra o **Postgres local**, com três trocas e só três:
   - a **Stripe** vira um gravador (`checkout.sessions.create` guarda o objeto recebido e devolve
     um id falso; `coupons.create/retrieve` idem);
   - `@/lib/get-effective-user` e `@/lib/patient-gate` devolvem o **paciente de teste**.

   Tudo o mais é o código de produção: `reservarCupom`, `applyCoupon`, `precoDoPacote`, o Prisma.

   **Este é o método da prioridade 1.** Como não posso chamar a Stripe, o `unit_amount` que
   aparece nos outputs é o valor do objeto que a rota **entrega ao SDK** — um passo antes da rede.

   ```
   npx jest --roots <pasta> --testMatch "**/qa-t3-t4.test.ts" --runInBand --forceExit
   → Tests: 19 passed, 19 total
   ```
3. **Suíte do projeto** — `npx jest __tests__/coupon` → **132 passed, 6 suites**. Registro a
   ressalva do review (B-7): boa parte dessa suíte lê o **texto** dos arquivos; foi por isso que
   escrevi o harness que executa.
4. **Playwright** no alvo web do Expo (`:8081`) — **não deu**: ver F-4.

**Dados de teste criados** (linhas, identificáveis, clínica `qa084-coupon`):
clínica *QA084 Coupon Clinic*; pacientes `qa084.patient-a@example.com` e `qa084.patient-b@example.com`
(A sem exceção de preço, B com exceção da 082 de £40); `ServicePrice` CONSULTATION £100 e
TREATMENT_SESSION £80; 9 consultas `PENDING` de £100; um plano de tratamento de £200; um plano de
assinatura de £50/mês; dois pacotes (cheio £500, semanal £110/semana); 7 cupons:

| código | desconto | alcance | limites |
|---|---|---|---|
| `QA084-20` | 20% | os cinco | sem limite total, 99/paciente |
| `QA084-ONE` | 20% | consulta | **maxRedemptions 1, maxPerPatient 1** |
| `QA084-FULL` | 100% | consulta, plano | — |
| `QA084-EXPIRED` | 20% | os cinco | `endsAt` ontem |
| `QA084-MINE` | 30% | os cinco | mirado no paciente A |
| `QA084-PLANONLY` | 20% | **só assinatura** | — |
| `QA084-FIX15` | £15 fixos | os cinco | — |

---

## Resumo

| # | tipo | o que fiz | o que obtive | veredito |
|---|---|---|---|---|
| 3.1 | UI | cupom válido em Book appointment | servidor: `original 100 / discount 20 / final 80` + nome da campanha. A tela não pôde ser aberta (F-4) | ⚠️ servidor ok, tela não executada |
| 3.2 | UI | cupom inválido | quatro recusas distintas, cada uma com frase **EN e PT** (`not_found`, `expired`, `wrong_scope`, `not_for_you`), sempre HTTP 200 para a tela poder ler | ⚠️ servidor ok, tela não executada |
| 3.3 | UI | remover o cupom | só inspeção do componente (`remover()` → `onChange(null)` → `PrecoComCupom` sem risco) | ⚠️ não executado |
| 3.4 | API | **prévia repetida** | **24 chamadas** de prévia (10 delas com o cupom de uso único) → `CouponRedemption` da clínica de teste = **0** | ✅ |
| 3.5 | UI | sem digitar nada | checkout sem código cobra £100 (10000) e não grava resgate; a tela ganha uma linha nova ("Have a discount code?") — por decisão 3, não é regressão | ⚠️ servidor ok, tela não executada |
| 3.6 | UI | cupom de 100% | prévia `final: 0`; o checkout responde **409 `nothing_to_pay`**, não abre Checkout, **não grava resgate**, e a consulta fica `PENDING` para sempre | ❌ **F-2** |
| 3.7 | UI | exceção de preço (082) + cupom | paciente B (£40 por exceção): `original 40 / discount 8 / final 32`. A resposta **não tem campo nenhum** que revele a exceção | ✅ |
| 3.8 | UI | tela do exame | zero ocorrências de cupom/desconto em `mobile/app/(app)/(lab)/`; a prévia com `scope: "LAB_TEST"` responde **400 Unknown scope** | ✅ |
| 4.1 | API | **valor cobrado = valor mostrado** | consulta 80 → `unit_amount 8000`; fixo 85 → 8500; plano 160 → 16000; pacote cheio 400 → 40000. Sem cupom: 10000 | ✅ |
| 4.2 | API | **manipulação no corpo** | corpo com `discount:99, final:1, amount:1, price:1, unit_amount:1, original:10000` → `unit_amount 8000` e resgate gravado com `final 80`. Sem código, com desconto no corpo → 10000 | ✅ |
| 4.3 | UI/API | **dois toques** | com `maxPerPatient: 99` → **1** resgate, a sessão nova substitui a antiga. Com `maxPerPatient: 1` (o **padrão** do modelo) → o 2º toque é **recusado** com `already_used` | ⚠️ um resgate, sim — pelo caminho errado no padrão (**F-3**) |
| 4.4 | API | Stripe falha | harness: 502 + **0** resgates. E no servidor real (sem `STRIPE_SECRET_KEY`): 502 + **0** resgates | ✅ |
| 4.5 | API | **idempotência e expiração** | `confirmarPorSessao`: 1 na 1ª vez, **0** na 2ª. `descartarPorSessao` sobre o confirmado: **0** apagadas, linha intacta. Sobre a reserva: **1** apagada, e o outro paciente volta a conseguir o cupom | ✅ |
| 4.6 | API | limite esgotado no meio | os dois viam prévia ok; A paga (8000); **B recebe 409** com `limit_reached` em EN e PT — nunca 500 | ✅ |
| 4.7 | API | exame com `code` no corpo | **não existe rota de checkout de exame** (a compra da 081 está fechada). A rota de pedido ignorou `code`/`couponCode` (403 de consentimento) e o grep mostra que ela não conhece cupom | ⚠️ verificado por inspeção — não há o que cobrar ainda |
| 4.8 | API | `Order.discountCode` | nenhuma das quatro rotas cria `Order` — como a própria T-4 registrou no passo 5 | — n/a |
| 4.9 | API | rota fora do escopo com `code` | só **4** das 11 rotas que criam Checkout leem `couponCode`; as outras 7 não citam `reservarCupom`/`applyCoupon`. E um cupom de escopo errado numa rota do escopo é **recusado** (409), nunca descontado | ✅ |

---

## Detalhes, com os outputs

### 3.1 / 3.2 / 3.5 / 3.7 — a prévia (HTTP real em `:4100`)

```
### 3.1 cupom válido (consulta)
POST /api/patient/coupons/preview  {"code":"QA084-20","scope":"CONSULTATION"}
HTTP 200
{"ok":true,"code":"QA084-20","campaign":"QA084 vinte por cento","currency":"GBP","original":100,"discount":20,"final":80}

### minúsculas e espaços
{"code":"  qa084-20 ","scope":"CONSULTATION"}
{"ok":true,"code":"QA084-20",...,"original":100,"discount":20,"final":80}

### valor fixo £15
{"ok":true,"code":"QA084-FIX15","campaign":"QA084 quinze libras","original":100,"discount":15,"final":85}

### 3.6 cupom de 100%
{"ok":true,"code":"QA084-FULL","campaign":"QA084 cortesia","original":100,"discount":100,"final":0}

### 3.2a inexistente
{"ok":false,"reason":"not_found","error":"We do not recognise that code.","errorPt":"Não reconhecemos esse código."}

### 3.2b expirado
{"ok":false,"reason":"expired","error":"That code has expired.","errorPt":"Esse código expirou."}

### 3.2c escopo errado (cupom de assinatura numa consulta)
{"ok":false,"reason":"wrong_scope","error":"That code does not apply to this purchase.","errorPt":"Esse código não vale para esta compra."}

### 3.2d de outro paciente (B pedindo o cupom mirado em A)
{"ok":false,"reason":"not_for_you","error":"That code was issued for another patient.","errorPt":"Esse código foi emitido para outro paciente."}

### escopo de exame de laboratório
HTTP 400
{"error":"Unknown scope"}

### sessão de tratamento (£80)
{"ok":true,...,"original":80,"discount":16,"final":64}

### plano de tratamento (£200)
{"ok":true,...,"original":200,"discount":40,"final":160}

### assinatura (£50)
{"ok":true,...,"original":50,"discount":10,"final":40}

### manipulação: amount/discount/final no corpo da prévia
{"code":"QA084-20","scope":"CONSULTATION","amount":10000,"discount":9999,"final":1,"original":10000}
{"ok":true,...,"original":100,"discount":20,"final":80}      ← o corpo foi ignorado

### plano de outro paciente (targetId que não é do B)
{"ok":false,"error":"Plan not found.","errorPt":"Plano não encontrado."}

### sem token → HTTP 307 /login?callbackUrl=...
### token inválido → HTTP 401 {"error":"Unauthorized"}
```

**3.7 — exceção da 082 + cupom** (paciente B tem `PatientServicePrice` de £40):

```
B: {"ok":true,"code":"QA084-20","currency":"GBP","original":40,"discount":8,"final":32}
A: {"ok":true,"code":"QA084-20","currency":"GBP","original":100,"discount":20,"final":80}
```

O desconto é sobre o preço **dele**, e a resposta não tem nenhum campo que diga "isto é uma
exceção" — a decisão 3 da 082 continua de pé.

### 3.4 — a prévia não gasta o cupom ✅

24 chamadas de prévia no total (14 do bloco acima + 10 seguidas com `QA084-ONE`, que é de uso
único e `maxPerPatient: 1`). Todas as 10 responderam `ok:true`. Depois:

```
CouponRedemption total no banco: 0
```

### 4.1 — o valor cobrado é o valor mostrado ✅

Harness (rotas reais, Stripe gravada). **Método:** o `unit_amount` abaixo é o do objeto entregue a
`stripe.checkout.sessions.create`.

```
previa: {"ok":true,"code":"QA084-20",...,"original":100,"discount":20,"final":80}
status do checkout: 200
unit_amount enviado a Stripe: 8000
metadata: {"appointmentId":"cmui88zxf...","patientId":"cmui88zx4...","kind":"FIRST_CONSULTATION",
           "couponCode":"QA084-20","couponRedemptionId":"cmui93atl0001xzu04oep7dek"}
CouponRedemption: [{"orig":100,"desc":20,"final":80,"sessao":"cs_qa084_1","confirmado":null}]

sem cupom:      unit_amount: 10000   metadata sem couponCode
valor fixo £15: previa final 85  →  unit_amount: 8500
plano £200:     previa final 160 →  unit_amount: 16000
pacote £500:    previa final 400 →  unit_amount: 40000   (mode: payment)
```

**As duas cobranças recorrentes não descontam o `unit_amount`** — e é de propósito (decisão 4b):

```
pacote semanal — previa (o que a tela mostraria): {"original":110,"discount":22,"final":88}
   unit_amount (semanal, sem desconto): 11000
   recurring: {"interval":"week"}
   discounts: [{"coupon":"bpr-pct-QA084-20-20"}]
   cupom criado na Stripe: [{"id":"bpr-pct-QA084-20-20","name":"QA084-20","duration":"once","percent_off":20}]

assinatura — previa: {"original":50,"discount":10,"final":40}
   line_items: [{"price":"price_qa084_fake","quantity":1}]      ← price do catálogo, intacto
   discounts: [{"coupon":"bpr-pct-QA084-20-20"}]
   cupom criado na Stripe: [{... "duration":"once","percent_off":20}]

id determinístico: com o cupom já existente na Stripe, `coupons.create` não é chamado
   cupons criados (deve ser nenhum): []
   discounts: [{"coupon":"bpr-pct-QA084-20-20"}]
```

O mecanismo está certo. **O que a tela faz com isso, não** — ver F-1.

### 4.2 — manipulação ✅

```
corpo enviado: {"couponCode":"QA084-20","discount":99,"final":1,"amount":1,"price":1,"original":10000}
unit_amount: 8000
resgate gravado: [{"orig":100,"desc":20,"final":80}]

sem código, com desconto no corpo ({"discount":90,"final":10,"amount":10}):
unit_amount: 10000        resgates: 0
```

O mesmo vale para o plano de tratamento e o pacote (mandei `final:1`/`amount:1` nos dois; saíram
16000 e 40000). E a prévia também ignora um `amount` no corpo (output em 3.1).

### 4.3 — dois toques ⚠️

Com `maxPerPatient: 99` o `find-then-write` roda como a decisão 4 descreve:

```
status dos dois toques: [200,200]
sessoes criadas: ["cs_qa084_1","cs_qa084_2"]
linhas de resgate: [{"id":"cmui93auy0007xzu0gw0wp0hf","sessao":"cs_qa084_2","final":80}]
```

Uma linha só, e ela passa a apontar para a sessão nova. Mas com **`maxPerPatient: 1`** — que é o
`@default(1)` do modelo e o padrão que a T-2 grava:

```
1o toque: {"status":200,"unit_amount":8000,"sessao":"cs_qa084_1"}
2o toque: {"status":409,"body":{"error":"You have already used that code.",
           "errorPt":"Você já usou esse código.","code":"coupon_rejected","reason":"already_used"}}
linhas de resgate: [{"sessao":"cs_qa084_1","final":80}]
```

Continua sendo **um** resgate — o limite não foi furado —, mas pelo motivo errado: a própria
reserva do paciente conta contra o limite **dele**, e o caminho de reaproveitamento nunca roda.
Ver F-3.

### 4.4 — checkout que falha não deixa resgate ✅

No harness, com a Stripe recusando:

```
[appointment-checkout] QA084: falha simulada ao criar a sessao
resposta: {"status":502,"body":{"error":"Could not start the payment.","errorPt":"Não foi possível iniciar o pagamento."}}
resgates apos a falha: 0
```

E no **servidor real** (`:4100`, onde `STRIPE_SECRET_KEY` nem está configurada):

```
POST /api/patient/appointments/<id>/checkout  {"couponCode":"QA084-20"}
HTTP 502
{"error":"Could not start the payment.","errorPt":"Não foi possível iniciar o pagamento."}
→ resgates da clínica de teste: 0
```

### 4.5 — idempotência e expiração ✅

```
confirmarPorSessao 1a vez (linhas alteradas): 1
confirmarPorSessao 2a vez (linhas alteradas): 0
descartarPorSessao sobre o confirmado (linhas apagadas): 0
resgate continua no banco: [{"sessao":"cs_qa084_1","confirmado":"2026-09-26T10:32:21.972Z"}]

— sessão expirada —
reserva do A: [{"sessao":"cs_qa084_1","confirmado":null}]
previa do B com a vaga ocupada: {"ok":false,"reason":"limit_reached","error":"That code has reached its limit.",
                                 "errorPt":"Esse código atingiu o limite de usos."}
descartarPorSessao (linhas apagadas): 1
previa do B depois de a sessao expirar: {"ok":true,"code":"QA084-ONE",...,"original":40,"discount":8,"final":32}
```

(O £40 do B é a exceção da 082 dele — coerente com 3.7.)

### 4.6 — limite esgotado entre a prévia e o pagamento ✅

```
previa de A e de B antes de qualquer resgate: [80,32]     ← os dois veem o cupom valer
A paga: {"status":200,"unit_amount":8000}
B tenta pagar: {"status":409,"body":{"error":"That code has reached its limit.",
                "errorPt":"Esse código atingiu o limite de usos.","code":"coupon_rejected","reason":"limit_reached"}}
resgates do cupom de uso unico: [{"paciente":"A","final":80}]
```

409 com frase nos dois idiomas, não 500.

### 4.7 — o exame não tem cupom ⚠️ (inspeção, e não há o que cobrar ainda)

O qa-spec pede "checkout do exame com `code` no corpo". **Essa rota não existe**: das 11 rotas que
criam Checkout, nenhuma é do laboratório — a compra da 081 está parada em T-5/T-6. O que dá para
verificar, verifiquei:

```
=== cupom nas telas do lab (mobile/app/(app)/(lab)/) ===
(vazio = nenhum campo de cupom)

=== rota de pedido do exame conhece cupom? ===
(vazio)

POST /api/mobile/labs/orders  {"items":[...],"code":"QA084-20","couponCode":"QA084-20"}
HTTP 403
{"error":"Please read and accept the laboratory test notice before ordering.", ... "code":"consent_required"}
→ nenhum resgate gravado

prévia com scope LAB_TEST → HTTP 400 {"error":"Unknown scope"}
```

`LAB_TEST` não existe em `CouponScope` (confirmado no Postgres local: o enum tem exatamente
`CONSULTATION, TREATMENT_SESSION, PACKAGE, TREATMENT_PLAN, MEMBERSHIP`), então um pedido com ele
morre antes do cálculo. **Decisão 5 do plano: cumprida.**

### 4.9 — quem está fora do escopo cobra cheio ✅

```
=== rotas que criam Checkout (11) ===
admin/appointments · admin/patients/[id]/packages/checkout · appointments/[id]/reschedule ·
billing/checkout · patient/appointments/[id]/checkout · patient/marketplace/checkout ·
patient/membership/subscribe · patient/packages/checkout · patient/treatment-plans/checkout ·
payments/create-checkout · shop/checkout

=== as que chamam reservarCupom/applyCoupon (4 + a prévia) ===
patient/appointments/[id]/checkout · patient/membership/subscribe ·
patient/packages/checkout · patient/treatment-plans/checkout   (+ patient/coupons/preview)

=== quem lê couponCode do corpo ===
exatamente essas quatro
```

E dentro do escopo, um cupom que não serve é recusado em vez de aplicado:

```
cupom de assinatura numa consulta:
  {"status":409,...,"reason":"wrong_scope"}   sessoes criadas: 0   resgates: 0
cupom mirado em A, pedido por B:
  {"status":409,...,"reason":"not_for_you"}   resgates: 0
```

---

## Falhas

### F-1 · alta — a tela promete a mensalidade descontada para sempre (reprova o par)

**Onde:** `mobile/app/(app)/(clinica)/plans.tsx:195-199` + `lib/coupon-redemption.ts` (`cupomStripe`).

A tela de planos renderiza `PrecoComCupom(original=50, cupom.final=40, suffix="/ monthly")`, isto é:
**~~£50~~ £40 / monthly**. O que vai à Stripe (output de 4.1) é o `price` do catálogo **intacto**
mais `discounts: [{coupon: "bpr-pct-QA084-20-20"}]`, e esse cupom é `duration: "once"`.

Resultado: £40 na adesão, **£50 do segundo mês em diante**. A tela não diz "no primeiro mês".

É a mesma família da N4 da 080 — a tela prometendo um número e a cobrança sendo outra —, só que
deslocada no tempo, que é o lugar onde ninguém confere. A decisão 4b do plano registra o `once`;
a **tela** não foi ajustada a ele.

O pacote **semanal** tem o mesmo desenho (prévia diz £88, só a primeira semana desce), mas hoje é
inalcançável: nenhuma tela do app coleta cupom para pacote (ver F-4b).

**Onde olhar:** ou a tela escreve "£40 no primeiro mês, £50 depois" (EN e PT), ou não risca preço
recorrente. Bate com o A-3 do `review-084.md`.

### F-2 · alta — cupom de 100% quebra a venda em vez de ser cortesia (reprova o par)

**Onde:** `app/api/patient/appointments/[id]/checkout/route.ts:106-115` e `lib/coupon-redemption.ts`
(`confirmarSemCobranca`).

Observado no harness, com a rota real:

```
previa: {"ok":true,"code":"QA084-FULL","campaign":"QA084 cortesia","original":100,"discount":100,"final":0}
resposta do checkout: {"status":409,"body":{"error":"Nothing to pay.","errorPt":"Nada a pagar.","code":"nothing_to_pay"}}
sessoes da Stripe criadas: 0
resgates gravados: 0
consulta depois: {"status":"PENDING","price":100}
```

A prévia diz "£0"; o checkout responde **erro**; a reserva é devolvida; a consulta fica `PENDING`
e ninguém a confirma. No app (`book-appointment.tsx:114-129`) esse 409 cai no `catch` e o paciente
lê *"Booked, not paid yet — Open Appointments to pay and confirm it"*, e lá o mesmo 409 se repete.

`confirmarSemCobranca`, escrita exatamente para este caso, **não é chamada em lugar nenhum**:

```
=== quem chama confirmarSemCobranca ===
(vazio = ninguém)
```

Isso reprova o cenário **3.6** do qa-spec e a **suposição 8** do plano ("desconto de 100% é válido —
cortesia com código, e o checkout é pulado"). Bate com o A-2 do `review-084.md`.

**Não testei** 100% em plano de tratamento e em pacote; ali o valor final zerado viraria um
`unit_amount: 0` na Stripe, que tem mínimo de cobrança — provavelmente outro erro, por outro
caminho.

### F-3 · média — o segundo toque é recusado quando `maxPerPatient` é 1 (o padrão)

**Onde:** `lib/coupon.ts` (a contagem `ocupando` inclui a reserva do próprio paciente) +
`lib/coupon-redemption.ts` (o `find-then-write` que nunca chega a rodar).

Output em 4.3. O limite não é furado (uma linha só), mas:

- quem toca duas vezes recebe *"You have already used that code."*;
- quem abre o Checkout, desiste e volta em menos de 1h também;

e nos dois casos o cupom fica travado por até uma hora **para o dono dele**. O cenário 4.3 do
qa-spec ("dois toques → um `CouponRedemption`") passa na letra e falha na intenção. Bate com A-1.

### F-4 · informativa — não deu para testar nenhuma tela do app

O alvo **web** do Expo (`:8081`, já rodando) não renderiza: `expo-notifications` estoura no
primeiro render do layout raiz e a página fica em branco.

```
Uncaught Error: The method or property ExpoNotifications.getLastNotificationResponse is not
available on web, are you sure you've linked all the native dependencies properly?
  at getLastNotificationResponse (node_modules/expo-notifications/build/NotificationsEmitter.js)
  at useLastNotificationResponse (...)
  Component Stack: PushRouter (src/components/PushRouter.tsx) → RootLayout (app/_layout.tsx)
```

Evidência: `screenshots/t-3-expo-web-nao-carrega.png` (página em branco com o balão do erro).
Dispensei o overlay e nada há atrás dele. Sem simulador iOS/Android à mão, **os cenários 3.1, 3.2,
3.3, 3.5 e 3.6 não foram executados na tela** — o que está verificado deles é o servidor (acima) e
a leitura do componente. Nada disso é do 084; é um defeito do alvo web, pré-existente.

Também não há como renderizar o componente isolado: `mobile/` não tem
`@testing-library/react-native` nem `react-test-renderer` (e não instalei nada).

**F-4b (relacionado):** a T-3 diz que `plans.tsx` cobre *"adesão a plano e pacote de tratamento"*.
Não cobre: a tela lista **só planos de assinatura**, e o único `CouponField` dela é
`scope="MEMBERSHIP"`. `PACKAGE` e `TREATMENT_PLAN` têm servidor pronto, tela do painel oferecendo os
alcances, e **nenhum lugar onde o paciente digite o código** — nem no app, nem no dashboard web.
Um cupom de pacote criado hoje é um cupom que ninguém consegue usar. (= B-2 do review.)

### F-5 · ambiente — o Postgres local é compartilhado, e tem outra sessão escrevendo nele

Durante o QA apareceram duas linhas de `CouponRedemption` que **não são minhas** (cupom `USEDCODE`,
pacientes da clínica *QA Clinic A*, sessões `cs_test_qa084_confirmed` / `cs_test_qa084_abandoned`,
criadas 10:16). Não toquei nelas. Por isso todas as contagens deste relatório são **escopadas à
clínica de teste** — uma contagem global do banco não prova nada aqui. Se outro worktree rodar QA
de cupom ao mesmo tempo, os números se misturam.

---

## Erros de console

Um só, e não é do 084: o `ExpoNotifications.getLastNotificationResponse` da F-4. As chamadas HTTP
foram por `curl`, e o harness roda sem browser.

---

## Estado em que deixei

- **Banco:** os dados de teste `QA084` ficaram de pé (clínica `qa084-coupon`, os dois pacientes,
  os cupons, as consultas) — servem para repetir este QA e para a rodada online. Resgates da
  clínica de teste: **0**. Os pacientes de teste têm senha (`Qa084!teste`) para o dia em que der
  para abrir a tela.
- **Worktree:** sem alteração de código. Acrescentei só
  `specs/084-cupom-de-desconto/qa/report-t-3-t-4.md`, `qa/harness-t-3-t-4.test.ts.txt` e
  `qa/screenshots/t-3-expo-web-nao-carrega.png`. A pasta temporária de execução do harness foi
  removida.
- **Nunca tocado:** produção, `bpr.clinic`, Stripe real, paciente real.

## O que falta, quando os dois defeitos forem resolvidos

1. Repetir 3.6 (cortesia de 100%) e 3.1 na tela de planos — de preferência num simulador, já que
   o alvo web não sobe.
2. Os cenários de tela 3.1/3.2/3.3/3.5 continuam **não executados**.
3. QA online obrigatório depois do deploy (2.4, 3.1, 3.2, 4.1, 4.3 em produção, conferindo o
   commit pela lista de deployments do Coolify).
