# Code review adversarial — Atividade 084 (cupom de desconto)

**Data:** 26/09/2026
**Worktree:** `C:\Users\bruno\orca\workspaces\clinic\app_clinic` · branch `brunoto02028/app_clinic`
**Revisado:** tudo que é do cupom no working tree (schema, `lib/coupon.ts`, `lib/coupon-redemption.ts`,
`lib/package-price.ts`, as 3 rotas admin, a tela `/admin/coupons`, a prévia, as 4 rotas de checkout,
o webhook, `CouponField`/`coupons.ts` e as duas telas do app, `__tests__/coupon/*`).
**Papel:** revisor. Nenhum arquivo do produto foi alterado.

**Veredito: reprovado** — o par T-3+T-4 não pode ser deployado como está. Três defeitos de alta
severidade, todos nos caminhos que esta atividade existe para proteger. T-1 e T-2 estão perto de
aprovados (só texto obsoleto e a data de fim).

## Como verifiquei

- `npx jest __tests__/coupon` → **132 passam** (6 suítes). Passar não quis dizer muito: ver A-1 e B-7.
- `npx tsc --noEmit -p tsconfig.json`, filtrando `mobile/` e `reconstruir/` → **nenhum erro nos
  arquivos do cupom**. Os dois erros em `app/api/webhooks/stripe/route.ts:337-338` são anteriores
  (existem iguais em `HEAD`).
- `cd mobile && npx tsc --noEmit -p tsconfig.json` → **0 erros** (as telas e o `CouponField` tipam).
- Um harness meu, fora do repositório, com `prisma` trocado por tabela em memória **com o filtro de
  verdade** (o mesmo `where` que o código manda), para observar a corrida do resgate em vez de
  presumi-la. Output colado em A-1.
- `node -e` para a aritmética de datas (B-5) e conferência manual da conversão para centavos nas
  quatro rotas.

## Achados

| # | sev | arquivo:linha | o defeito | o caminho que dispara |
|---|---|---|---|---|
| A-1 | alta | `lib/coupon.ts:197-211` + `lib/coupon-redemption.ts:79-111` | A reserva do próprio paciente conta contra o `maxPerPatient` dele, então o **segundo** pedido é recusado com `already_used` e o `find-then-write` nunca roda | Paciente toca em pagar (reserva criada), fecha a folha do Stripe, tenta de novo dentro de 1h → "You have already used that code." e paga o preço cheio |
| A-2 | alta | `app/api/patient/appointments/[id]/checkout/route.ts:106-115` · `lib/coupon-redemption.ts:193-205` | Cupom de 100% **quebra a venda** em vez de ser cortesia: 409 `nothing_to_pay` com a consulta já criada como `PENDING`, e `confirmarSemCobranca` (escrita para este caso) nunca é chamada | Cupom de 100% (a tela do painel anuncia: "A hundred means free — courtesy with a code") numa consulta de £100 → `aCobrar = 0` → 409; o app diz "Booked, not paid yet. Open Appointments to pay" numa tela que não tem botão de pagar |
| A-3 | alta | `mobile/app/(app)/(clinica)/plans.tsx:195-199` + `lib/coupon-redemption.ts:140-168` | A tela promete **£80 / month** para sempre; o cupom da Stripe é `duration: "once"` — só a primeira mensalidade desce | Paciente aplica cupom de 20% num plano de £100/mês: vê `£100` riscado e `£80.00 / month`, paga £80 na adesão e **£100 nos meses seguintes** |
| B-1 | média | `app/api/patient/coupons/preview/route.ts:40-51` vs `lib/booking-options.ts:117-121` | Recusa que manda a pessoa ao lugar errado: a prévia exige uma linha `TREATMENT_SESSION`, a tela mostra o preço caindo para o de `CONSULTATION` | Clínica precificou só consulta; paciente que já teve consulta abre "Extra session £100" com campo de cupom → código válido responde "Your clinic has not set a price for this yet." (o checkout, esse, honraria o cupom) |
| B-2 | média | nenhum cliente manda `couponCode` para pacote/plano (`mobile/src/api/*`, `app/dashboard/treatment/page.tsx:294`) | `PACKAGE` e `TREATMENT_PLAN` são inalcançáveis: as rotas aceitam, a tela do painel oferece os dois alcances, e **nenhuma tela coleta o código** | Superadmin cria cupom de pacote → nenhum paciente consegue digitá-lo (nem no app, nem no dashboard web, que não tem campo de cupom nenhum) |
| B-3 | média | `lib/coupon-redemption.ts:79-111` (sem transação nem índice único) | A corrida da decisão 4 foi **estreitada, não fechada**; e o limite é furável por construção, porque a sessão do Stripe vive 24h e a reserva só ocupa 1h | Dois pacientes pedem o checkout no mesmo instante com `maxRedemptions: 1` → os dois contam 0, os dois reservam, os dois pagam. Ou: A reserva e paga em 90 min; B reserva aos 65 min e paga. O webhook confirma os dois sem reconferir o limite |
| B-4 | média | `mobile/src/api/client.ts:155-162` · `mobile/app/(app)/(clinica)/book-appointment.tsx:118-128` | A recusa do checkout chega **só em inglês**, ou não chega: `ApiError` carrega apenas `data.error` e o `errorPt` de todas as rotas é descartado | Aparelho em PT com cupom recusado no pagamento: em `plans.tsx` sai a frase inglesa; em `book-appointment.tsx` a frase é engolida e trocada por "Marcado, ainda não pago" |
| B-5 | média | `app/api/admin/coupons/route.ts:122-123` · `[id]/route.ts:116-117` · `page.tsx:76-84` | A campanha morre **um dia antes**: `new Date("2026-09-30")` é 00:00Z, e a lista escreve "until 30/09/2026" | Cupom com fim em 30/09; paciente digita no dia 30 às 10:00 BST → `expired`. Provado: `endsAt=2026-09-30T00:00:00Z < 2026-09-30T09:00:00Z` |
| B-6 | média | `app/admin/coupons/page.tsx:548,316-320` · `app/api/admin/coupons/route.ts:36-42` · `prisma/schema.prisma:4849-4852` | A tela e dois comentários afirmam o contrário do que o limite faz desde a T-4 ("Only paid uses count", "o limite conta só os confirmados", "Resgate sem confirmação **não** conta") | Um checkout abandonado há 10 min: o painel mostra `0/1 used` e o paciente seguinte é recusado com `limit_reached` |
| B-7 | média | `__tests__/coupon/checkout-amount.test.ts`, `app-field.test.ts`, `admin-route.test.ts`; `redemption.test.ts:107-114` | **73 dos 132 testes** (55%) leem os arquivos como texto e não executam nada; e o teste do toque duplo usa um estado que o banco não produz, o que é por que A-1 passou batido | Ver a lista de asserções falsificáveis abaixo |
| B-8 | média | `app/api/admin/coupons/route.ts`, `[id]/route.ts`, `[id]/redemptions/route.ts` (nenhuma tem `try/catch`) | Qualquer exceção numa rota de escrita do cupom sobe crua: **500 sem corpo**, e a tela cai no `catch` genérico "That did not save" | POST/PATCH com data inválida (`startsAt: "31/09/2026"`) — `validateCouponInput` só compara datas quando as **duas** vêm e ignora as inválidas, então `new Date(...)` = `Invalid Date` chega ao Prisma e estoura. É o mesmo sintoma que o QA da T-2 registrou como o achado que levaria antes do deploy |
| C-1 | baixa | `lib/coupon.ts:269-271` + `appointments/[id]/checkout:88`, `treatment-plans:64`, `membership:154` | A guarda `wrong_currency` não dispararia no dia para o qual foi escrita: três rotas passam a string literal `"GBP"` em vez da moeda da compra (só o pacote passa `preco.currency`) | Clínica em EUR com cupom fixo em GBP: a comparação é `"GBP" !== "GBP"` → passa, e desconta 15 da moeda errada |
| C-2 | baixa | `app/api/patient/appointments/[id]/checkout/route.ts:86` | `AppointmentKind` tem quatro valores e o ternário só separa `FIRST_CONSULTATION`: `CLINIC_BOOKED` (o **default** da coluna) cai em `TREATMENT_SESSION` | Consulta marcada pela clínica e paga pela rota do paciente consome cupom de sessão; cupom de consulta é recusado com `wrong_scope`. Hoje sem UI que chegue lá |
| C-3 | baixa | `app/api/patient/packages/checkout/route.ts:81,90` | Código morto: `pkg.clinicId ? … : sem_cupom` — `TreatmentPackage.clinicId` é `String` não-nulável no schema | — (inofensivo; o mesmo padrão em `appointment.clinicId` é legítimo, lá a coluna é opcional) |
| C-4 | baixa | `app/api/admin/coupons/[id]/route.ts:102-127` | `currency` não é editável no PATCH e o POST aceita qualquer string em `body.currency` sem validar | Cupom criado por API com `currency: "USD"` recusa em todo lugar com `wrong_currency` e não há como corrigir pela tela |

### A-1 — o segundo pedido é recusado (provado)

`resolveCoupon` conta, para o limite do paciente, "confirmado **ou** criado na última hora"
(`lib/coupon.ts:197-211`) — e a reserva que o próprio paciente acabou de criar cai na segunda metade
do `OR`. Com o padrão `maxPerPatient: 1`, o segundo pedido morre em `already_used` **antes** de
chegar ao `find-then-write` de `reservarCupom` (`lib/coupon-redemption.ts:79-111`). Esse ramo de
reaproveitamento é, portanto, inalcançável na configuração padrão — e com ele os dois testes que o
cobrem.

Harness (prisma em memória, filtro de verdade, `maxPerPatient: 1`):

```
1o toque: {"tipo":"reservado","reserva":{"redemptionId":"r1","code":"VERAO10","original":100,"discount":20,"final":80,...}}
2o toque: {"tipo":"recusado","recusa":{"ok":false,"reason":"already_used",
           "message":"You have already used that code.","messagePt":"Você já usou esse código."}}
linhas gravadas: 1
```

O critério de aceite da T-4 ("Dois toques no botão geram **um** resgate") está escrito de um jeito
que o cenário 4.3 do qa-spec pode marcar verde — uma linha foi gravada, afinal — enquanto a pessoa
vê uma recusa. E o efeito real não é o toque duplo, é a **retentativa**: quem cancela a folha do
Stripe e volta em menos de uma hora é informado de que já usou o código.

Direção de correção (uma linha): o limite **por paciente** conta só `confirmedAt != null`, e a janela
de reserva fica valendo apenas para o limite **total** — que é onde a corrida entre duas pessoas
existe. Alternativa: excluir do `count` a reserva em aberto do próprio paciente.

### A-2 — cupom de 100%

A rota da consulta recusa `aCobrar <= 0` com `nothing_to_pay`, e o comentário ao lado afirma *"Isto
não acontece hoje — a consulta com preço zero é recusada acima"*. A afirmação é falsa: o zero não vem
do preço da consulta (esse é validado em `:61`), vem do **cupom**. O resultado é uma consulta
`PENDING` que ninguém consegue confirmar, porque não há Checkout, não há webhook, e
`confirmarSemCobranca` — escrita exatamente para esse caso, com comentário e tudo — não é importada
em lugar nenhum do repositório (`grep -rn confirmarSemCobranca` acha só a própria definição).

Nas outras portas o mesmo cupom manda `unit_amount: 0` para o Stripe
(`packages:113,145`, `treatment-plans:108`), sem nenhum tratamento de total zero; no melhor caso o
paciente vê um `500` com a mensagem crua da Stripe, porque o `catch` dessas duas rotas devolve
`err.message`.

Isso contraria a suposição 8 do plano, o cenário 3.6 do qa-spec e a frase que a própria tela do
painel mostra ao Bruno enquanto ele cria o cupom.

### A-3 — "£80 / month"

`PrecoComCupom` recebe `suffix={"/ month"}` e imprime `final` com esse sufixo
(`CouponField.tsx:191-198`). O desconto, porém, é um cupom da Stripe com `duration: "once"`
(`coupon-redemption.ts:158`) — decisão 4b do plano, e está certa. O que falta é a tela dizer isso: o
paciente lê um preço mensal permanente. É a mesma família da N4 da 080 com o sinal invertido — a tela
promete **mais** do que o cartão vai entregar. Vale para a adesão (`MEMBERSHIP`) e valeria para o
pacote semanal, se o pacote tivesse campo de cupom (B-2).

### B-7 — asserções que passariam com o código errado

- `expect(src).toContain("liberarReserva")` / `"anexarSessao"` / `"COUPON_CREATED"` /
  `"confirmarPorSessao(session.id)"` — esses três arquivos só removem comentários em dois pontos
  específicos, então **uma menção em comentário satisfaz a asserção**.
- `admin-route.test.ts:44` (o que cobre "ADMIN e THERAPIST recebem 403") é
  `expect(src).toMatch(/role !== "SUPERADMIN"/)`: nenhum handler é invocado, e uma guarda colocada
  **depois** da escrita passaria igual.
- `checkout-amount.test.ts:52` `expect(pacote).toMatch(/amount = cupom\.reserva\.final \* 100/)`
  passaria com essa linha movida para dentro do `if (preco.recurring)` — isto é, com exatamente o
  defeito que a decisão 4b existe para evitar.
- `app-field.test.ts:31` ("não grava resgate nenhum") proíbe `couponRedemption.(create|upsert|update)`
  no texto da prévia; a prévia passando a chamar `reservarCupom()` passaria no teste e gravaria.
- `redemption.test.ts:107-114` ("dois toques são um resgate") mocka `count → 0` **e**
  `findFirst → {id:"r-antiga"}` ao mesmo tempo. O banco não produz esse estado: se existe reserva na
  janela, a contagem é ≥ 1. É esse mock contraditório que deixou A-1 passar.

O que **de fato** exercita código é `resolve.test.ts`, `apply.test.ts` e metade de
`redemption.test.ts` (59 testes) — e a parte de aritmética de `apply.test.ts` é boa. Falta o teste
que o nome do arquivo promete: invocar uma rota de checkout com cupom e afirmar o `unit_amount` que
chegou ao stub da Stripe.

## Decisões de design que estão bem resolvidas

- **Tenant.** Não achei vazamento. `resolveCoupon` põe o `clinicId` dentro do `findUnique`
  (`clinicId_code`) e devolve `not_found` para cupom de outra clínica, sem virar verificador de cupom
  alheio; as três rotas admin usam `getSessionStaffActor` + `findFirst({ id, clinicId })`; mirar num
  paciente exige `{ id, clinicId, role: "PATIENT" }`; a prévia usa `getActor` e filtra
  plano/pacote/plano-de-tratamento por `patientId` **e** `clinicId`. Nada por header, nada por
  `session.user.clinicId`.
- **A prévia não aceita `amount` do app.** Mudança acertada em relação ao que a T-3 tinha escrito, e a
  razão está no comentário: aceitar o valor do cliente seria pedir 20% de £10.000 e receber a conta
  pronta.
- **Cupom é superadmin-only nas três camadas** (rota, `SUPERADMIN_ONLY_ADMIN_PAGES`, `superadminOnly`
  no menu), e a 082 foi apertada na mesma passada (`patient-prices` deixou de aceitar ADMIN).
- **Exame fora do enum.** É a garantia mais forte disponível, e o teste afirma sobre os **valores** do
  enum em vez de proibir a string — cuidado certo, porque `LAB_TESTS_CONSENT_ACCEPTED` é legítimo.
- **Um arredondamento só.** `applyCoupon` arredonda uma vez, limita o desconto ao valor (£30 sobre £20
  zera, não devolve £10) e distingue percentual de valor fixo até dentro do cupom da Stripe. Refiz a
  conta das quatro rotas: a conversão para centavos é sempre `Math.round(valor * 100)` sobre um número
  já arredondado a centavos.
- **Decisão 4b** é a coisa mais afiada da atividade: perceber que baixar o `unit_amount` de um preço
  recorrente descontaria para sempre, e resolver com um cupom da Stripe de id determinístico.
- **`precoDoPacote` extraída** — prévia e checkout respondendo pela mesma função é o que a decisão 2
  pede, e a rota do pacote ficou mais legível do que estava.
- **Idempotência do webhook** (`updateMany`/`deleteMany` com `confirmedAt: null`) está correta, e
  `liberarReserva` não lança porque roda dentro de `catch`.

## Hipóteses que investiguei e descartei (10)

1. Prévia influenciável por header → `getActor` relê papel e tenant do banco; o cookie
   `selected-clinic-id` só vale para staff.
2. `plan.clinicId` nulo em `treatment-plans` gerando 500 → a coluna é `String` não-nulável.
3. `req.json()` lido duas vezes na rota da consulta → é lido uma vez.
4. Cupom aplicado ficando preso ao trocar o escopo na tela de marcar → `porta.kind` é decidido pelo
   servidor, não escolhido pelo paciente.
5. Divergência de arredondamento entre prévia e cobrança no pacote semanal → refiz com números
   quebrados (£54,1666/semana, 20%); fecha na mesma casa. Fica só a nota de que, no caminho
   recorrente, o `finalAmount` gravado pode diferir em 1p do que a Stripe calcula.
6. PATCH recusando a troca de percentual por valor fixo → a tela manda sempre as duas chaves, uma
   delas `null`.
7. Duplo arredondamento em `packages` (`final * 100` e depois `Math.round`) → sem erro.
8. Assinatura de plano de outra clínica → `plan.clinicId !== clinicId` devolve 404 antes do cupom.
9. Webhook confirmando resgate de outro produto → casa por `stripeSessionId`, que não colide.
10. Erros de tipo introduzidos → nenhum nos arquivos do cupom; os dois do webhook já existiam em
    `HEAD`, e `mobile/` compila com 0 erros no tsconfig dele.

## O que eu faria antes de deployar

1. **A-1** (uma linha em `lib/coupon.ts`) e um teste que rode `reservarCupom` duas vezes contra um
   prisma que **guarde** as linhas.
2. **A-2**: decidir o caminho do 100% — ou a venda sem Checkout, chamando `confirmarSemCobranca`, ou
   recusar o cupom de 100% na criação. Do jeito atual a tela do painel promete algo que nenhuma rota
   entrega.
3. **A-3**: a tela dizer "£80 no primeiro mês, £100 depois" (EN + PT), ou não riscar o preço mensal.
4. **B-4**: `ApiError` carregar `errorPt`, senão todo o cuidado bilíngue das rotas morre no cliente.
5. **B-6** e **B-5**: texto obsoleto e a data de fim — baratos, e os dois enganam o Bruno na tela dele.
6. **B-8**: `try/catch` nas três rotas admin (ou validar a data antes), porque hoje qualquer tropeço
   vira 500 sem corpo e a tela diz só "That did not save".

*Nota:* o `report-t-2.md` foi escrito em paralelo por outro agente neste mesmo worktree. Os achados
não se sobrepõem, com uma exceção: o 500 sem corpo que ele mediu é o B-8 desta revisão.
