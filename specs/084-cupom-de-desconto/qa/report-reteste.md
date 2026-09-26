# QA — reteste da 084 depois das correções (+ laboratório por paciente)

**Data:** 26/09/2026 · **Worktree:** `app_clinic`, branch `brunoto02028/app_clinic`, HEAD `db1290d3`
**Veredito: ⚠️ aprovado com ressalvas** — os 7 defeitos morreram; um achado novo de severidade alta
(**R-1**) decide se isto vai a produção como está.

Relatado por agente de QA; salvo aqui pela sessão principal porque a escrita do arquivo foi
bloqueada no ambiente dele. As evidências cruas estão em disco:

- `qa/harness-reteste.test.ts.txt` — as **rotas reais** contra o Postgres local, Stripe trocada por
  um gravador em memória. 18/18 passam.
- `qa/harness-reteste-dados.json.txt`
- `qa/screenshots/reteste-d5-lista-diz-27-edicao-diz-26.png`
- `qa/screenshots/reteste-d6-erro-e-try-again.png`
- `qa/screenshots/reteste-lab-app-areas-liberado-para-b.png`

## Servidor e banco

`http://localhost:4100`, PID 18560, confirmado como **este** checkout antes de medir
(`next dev -p 4100` a partir de `app_clinic/node_modules`). Banco `bpr_clinic_local`: só linhas do
QA, nenhum `db push`/`migrate`/DDL. Produção, `bpr.clinic`, Stripe real e paciente real: intocados.

**Snapshot medido** (os arquivos mudaram às 12:44 no meio da sessão; houve pedido de congelamento e
a medição é deste estado):

```
lib/coupon.ts             f5a9a045aab68f0febcdecb8022cd805  (12:44:01)
lib/coupon-redemption.ts  7e638d816fa3b49a7fdfee7304e9e54d  (12:44:25)
```

## Placar

| # | defeito | morreu? |
|---|---|---|
| 1 | A-1 · 2º pedido do mesmo paciente recusado | ✅ |
| 2 | A-2/F-2 · cupom de 100% quebrava a venda | ✅ |
| 3 | A-3/F-1 · "£40 / monthly" para sempre | ✅ (código; tela do app não executável) |
| 4 | F1 T-2 · 500 com corpo vazio | ✅ |
| 5 | campanha morrendo um dia antes | ✅ |
| 6 | F2 T-2 · estado vazio mentindo | ✅ |
| 7 | F4 T-2 · `currency: "banana"` aceita | ✅ |
| — | laboratório por paciente (nunca teve QA) | ✅ 20 estados |
| **R-1** | **novo, alta** — 1 resgate, 2 cobranças descontadas | ❌ |
| R-2 | novo, baixa — reserva órfã no 100% simultâneo | ⚠️ |
| R-3 | novo, baixa — data inexistente rolada em vez de recusada | ⚠️ |
| N-2 | confirmado em execução — a lista mostra o dia seguinte em BST | ⚠️ |

## As provas que importam

**A-1 morreu.** Dois toques do mesmo paciente com `maxPerPatient: 1`: dois `200`, **uma** linha de
resgate apontando para a sessão nova, nenhum `already_used`. E o limite continua limitando: depois
de o resgate ser confirmado, o mesmo paciente recebe `409 already_used`.

**O N-1 do review de correções morreu** nos dois cenários pedidos:

```
D1d  mesmo cupom de uso único em dois escopos (CONSULTATION + MEMBERSHIP)
     consulta: 200 · assinatura: 409 already_used · 1 resgate · 1 sessão

D1e  JANELA_RESERVA_MS = 86400000 (24h)
     B com reserva de A envelhecida 23h → 409 limit_reached
     B com reserva de A envelhecida 25h → 200
```

**A-2 morreu.** Cortesia de 100% numa consulta de £100: `PENDING → CONFIRMED`, `url: null`,
`covered: true`, **zero** sessões da Stripe, resgate confirmado. Duplo toque sequencial bate na
guarda de status (`409 not_payable`) e confirma **uma** vez. Abaixo de £0,30 é recusado com
`amount_too_small` nas cinco combinações medidas, e a reserva volta.

**Os textos e a tela.** `endsAt: "banana"` → `400` com frase EN+PT no POST e no PATCH; cupom com
fim hoje vale hoje; `currency: "banana"` e `"JPY"` → `400`, `"eur"` normalizada para `EUR`; e o card
de erro aparece com "Try again" funcional onde antes se lia "No coupons yet".

**Laboratório por paciente — a regra obedecida, exercitada pela tela:**

```
interruptor geral OFF, mod_lab liberado para B  →  A: ["clinica","ba"] · B: ["lab","clinica"]
interruptor geral ON,  mod_lab oculto para B    →  A: ["lab","clinica","ba"] · B: ["clinica"]
```

Os 20 estados incluem os três valores de negação (`false`, `"locked"`, `"hidden"`) — todos escondem,
que era o buraco de ler `"locked"` como string truthy — e a área clínica liberada por override para
quem tem `isClinicPatient: false`.

**Observação de usabilidade:** com `Full Access (VIP)` ligado os três botões ficam desabilitados, ou
seja, um paciente VIP não entra num piloto de laboratório sem perder o VIP.

## Achados novos

### R-1 · alta — um resgate, duas cobranças descontadas

`lib/coupon-redemption.ts` acha a reserva a reaproveitar por **(cupom, paciente, escopo)**. Isso não
distingue *dois toques na mesma compra* de *duas compras diferentes do mesmo tipo*. Com
`maxPerPatient: 1` e duas consultas `PENDING`:

```
toque na consulta 1: 200  unit_amount 8000
toque na consulta 2: 200  unit_amount 8000
resgates: UMA linha, apontando para cs_rt_2
webhook da sessão 1: 0 confirmações   ← ela não acha resgate nenhum
webhook da sessão 2: 1
```

Duas sessões nascem com £80 em vez de £100, e a `cs_rt_1` **continua viva** — nada no nosso código a
cancela. Pagando as duas: £160 por duas consultas de £100 com um cupom de **um** uso por paciente,
com **um** resgate no banco, "1 uso" na tela, e a guarda `LIMITE ESTOURADO` em silêncio (ela conta
linhas confirmadas, e há uma).

É o mesmo furo do N-1 — fechado **entre** escopos — aberto **dentro** de um escopo. Antes da
correção era impossível, porque o 2º toque morria em `already_used`.

Medido: as duas sessões com valor descontado, uma linha só, o webhook da 1ª não confirmando nada.
Inferido: que a Stripe aceitaria pagar a `cs_rt_1` — não há Stripe no ambiente para provar, mas nada
do nosso lado a invalida.

**Causa raiz:** `CouponRedemption` não guarda **a qual compra** pertence.

### R-2 · baixa — a reserva órfã do 100% simultâneo

Dois toques simultâneos na cortesia total criam duas linhas; uma é confirmada, a outra fica sem
sessão e sem confirmação, e ninguém a libera (`descartarPorSessao` não a acha; `liberarReserva` não
é chamado nesse caminho). Ocupa vaga da campanha por 24h e se auto-cura depois.

### R-3 · baixa — data inexistente é rolada, não recusada

`endsAt: "2026-02-30"` → `200` com `endsAt: 2026-03-02T23:59:59.999Z`. Inalcançável pela tela
(`input type="date"`), alcançável pela API.

### N-2 · confirmado em execução

Na mesma tela, ao mesmo tempo: a lista diz `until 27/09/2026`, o diálogo de edição diz `2026-09-26`,
o banco diz `2026-09-26T23:59:59.999Z`, o navegador está em `Europe/London` (BST). A costura que
sobrou é de **uma hora**: vale às 00:30 BST de 27/09, não vale às 01:30.

## Infra: por que houve um segundo dev server

O `:4100` servia **bundle obsoleto** da tela de cupons — medido, não suposto:

```
chunk do :4100 (coupons/page.js): { temFraseDeErro: false, temTestidErro: false }
chunk do :4137 (coupons/page.js): { temFraseDeErro: true,  temTestidErro: true  }
```

Sem subir o `:4137`, o defeito 6 teria sido **reprovado medindo código velho** — e foi, na primeira
tentativa. Toda medição de **tela** é do `:4137` (derrubado ao fim); as de **rota** são do `:4100`.
É o mesmo problema de HMR obsoleto já conhecido neste projeto: só resolve numa porta nova.

## O que falta

1. **R-1** decide se isto vai a produção.
2. As telas do app (3.1, 3.2, 3.3, 3.5, 3.6 do qa-spec) seguem **não executadas** — o alvo web do
   Expo estoura em `ExpoNotifications.getLastNotificationResponse` (pré-existente, alheio à 084), e
   só um simulador iOS/Android resolve.
3. `PACKAGE` e `TREATMENT_PLAN` têm servidor pronto e **nenhuma tela que colete o código**.
4. QA online obrigatório depois do deploy, conferindo o commit pela lista de deployments do Coolify.

## Conta de teste deixada no banco local

`qa084.superadmin@example.com` / `Qa084!teste`, SUPERADMIN da clínica `qa084-coupon`, para o QA poder
ser repetido. Apagar é uma linha, se o Bruno preferir.
