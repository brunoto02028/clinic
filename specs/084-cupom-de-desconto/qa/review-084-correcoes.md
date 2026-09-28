# Code review adversarial — correções da 084 e laboratório por paciente

**Data:** 26/09/2026
**Worktree:** `C:\Users\bruno\orca\workspaces\clinic\app_clinic` · branch `brunoto02028/app_clinic`
**Revisado:** o working tree inteiro do cupom depois das correções (`lib/coupon.ts`,
`lib/coupon-redemption.ts`, as quatro rotas de checkout, o webhook, as três rotas admin, a tela
`/admin/coupons`, `CouponField`/`client.ts`/`plans.tsx`/`book-appointment.tsx`, `__tests__/coupon/*`)
e o laboratório por paciente (`lib/module-registry.ts`, `app/api/mobile/modules/route.ts`,
`app/admin/patients/[id]/permissions/page.tsx`, `__tests__/labs/*`).
**Papel:** revisor. Nenhum arquivo do produto foi alterado — só este relatório.

**A pergunta desta rodada não era "os defeitos foram corrigidos?", era "a correção introduziu
outro?".** Foi. A correção do A-1 trocou um defeito de usabilidade por um de dinheiro: **um único
paciente consegue confirmar mais resgates do que `maxRedemptions` e `maxPerPatient` permitem**, com a
configuração padrão e pelas duas telas que existem hoje. Provado em execução contra o Postgres real,
duas vezes por caminhos diferentes.

**Veredito: reprovado** — por **N-1**, e só por ele. Os outros dois graves (A-2 e A-3) estão
resolvidos de verdade; o resto são médios e baixos, três deles textos que enganam o Bruno na tela
dele.

## Como verifiquei

- `npx jest` → **890 testes, 84 suítes, tudo passa**. Como na rodada anterior, passar não quis dizer
  muito: o teste que cobre a correção do A-1 afirma como *desejada* a brecha do N-1 (ver "Testes").
- `npx tsc --noEmit -p tsconfig.json`, filtrando `mobile/` e `reconstruir/` → nos arquivos das duas
  frentes, **os dois erros de sempre** em `app/api/webhooks/stripe/route.ts:337-338`, nas linhas que
  o diff não toca (anteriores, iguais em `HEAD`). O repositório tem 3.305 erros no total, ruído
  pré-existente e fora do escopo.
- `cd mobile && npx tsc --noEmit -p tsconfig.json` → **0 erros**.
- **Harness contra o Postgres local**, com o Prisma de verdade e as funções de produção
  (`resolveCoupon`, `reservarCupom`, `anexarSessao`, `confirmarPorSessao`) — nada mockado. Criei um
  cupom meu (`REV084-AUDIT`) na clínica de teste `qa084-coupon` que o QA deixou de pé, e apaguei no
  fim (cascade levou os resgates). Nenhum DDL, nenhuma linha de outra sessão tocada; os 2 resgates
  que estavam no banco antes continuam lá. Produção e Stripe intocados. Output colado em N-1.
- `TZ=Europe/London node -e ...` para a aritmética de fuso do N-2.
- Leitura do ramo de consulta do webhook, linha por linha, para responder à pergunta do efeito
  colateral esquecido (N-8 e "bem resolvido").

## Achados

| # | sev | arquivo:linha | o defeito | o caminho que dispara |
|---|---|---|---|---|
| N-1 | **alta** | `lib/coupon.ts:231-248` | O limite do paciente conta só confirmado e o da campanha exclui as reservas em aberto dele: as reservas do próprio paciente passam a **não contar para nada**. Ele acumula quantas quiser e paga todas | Cupom de `maxRedemptions: 1` e `maxPerPatient: 1` (o padrão) valendo em consulta **e** assinatura: aplica nas duas telas, paga as duas folhas → **2 resgates confirmados**. Ou um escopo só: abre o Checkout, deixa a folha aberta, volta 1h depois, marca outra sessão com o mesmo código e paga as duas (a sessão do Stripe vive 24h) → **2 resgates confirmados** |
| N-2 | média | `app/admin/coupons/page.tsx:80-88` + `lib/coupon.ts:153-160` | A lista passou a mostrar **o dia seguinte**: `endsAt` virou 23:59:59.999**Z** e a tela imprime no fuso do navegador. Em BST (metade do ano) "até 30/09" aparece como `until 01/10/2026` | Bruno cria um cupom com fim em 30/09 em Londres, hoje; a lista escreve `until 01/10/2026`. Provado: `2026-09-30T23:59:59.999Z` → `01/10/2026, 00:59:59` em `Europe/London` |
| N-3 | média | `app/admin/coupons/page.tsx:570` | O texto obsoleto (B-6) sobreviveu **invertido**: *"Only paid uses count — an abandoned checkout does not spend the campaign"* está embaixo de **Total uses**, o único limite em que um checkout aberto **gasta** a campanha | Paciente A abre o Checkout e não paga; B digita o código e recebe `limit_reached` (provado em C3 abaixo) enquanto a tela diz que checkout abandonado não gasta e mostra `0/1 used` |
| N-4 | média | `mobile/app/(app)/(clinica)/book-appointment.tsx:118-131` · `mobile/src/api/client.ts:104` | A recusa do cupom no checkout continua **engolida**, e `localizada()` não tem **nenhum** consumidor — `ApiError.messagePt` chega e ninguém lê. O beco sem saída que o A-2 fechou para o 100% segue aberto para toda outra recusa | B perde a corrida do cupom de uso único: a consulta é criada `PENDING`, o 409 cai no `catch`, o app diz *"Booked, not paid yet — Open Appointments to pay"*, e a aba Appointments **não tem botão de pagar**. Em `plans.tsx` a recusa sai em inglês num aparelho em PT (`(e as Error).message`) |
| N-5 | média | `app/admin/coupons/page.tsx:454` vs `packages/checkout:130` e `treatment-plans/checkout:85` | A tela promete *"A hundred means free — courtesy with a code"* para os cinco alcances; em pacote e plano de tratamento o 100% é recusado com *"leaves an amount too small to charge. Ask the clinic for a full courtesy instead"* — manda pedir a cortesia que a pessoa tem na mão | Cupom de 100% em `PACKAGE`/`TREATMENT_PLAN` (a tela deixa criar). Hoje inalcançável porque nenhuma tela coleta cupom nesses dois (B-2 segue aberto), então a frase errada espera o dia em que coletar |
| N-6 | baixa | `app/api/patient/appointments/[id]/checkout/route.ts:158-167` | `MINIMO_COBRAVEL` e `ABAIXO_DO_MINIMO` existem para não haver duas verdades, e esta rota repete `0.3` e as duas frases na mão | Mudar o mínimo em `coupon-redemption.ts` deixa a consulta em 0.3 |
| N-7 | baixa | `app/api/patient/treatment-plans/checkout/route.ts:85` | No ramo `stripePriceId` o valor comparado (`final`, derivado de `plan.totalPrice`) **não** é o que vai à Stripe (lá vai o `price` do catálogo + cupom deles). Só recusa demais, nunca de menos | 100% num plano com `stripePriceId`: a Stripe aceitaria `discounts` com total zero, e nós recusamos. Inalcançável hoje (B-2) |
| N-8 | baixa | `appointments/[id]/checkout:126-139` | Ordem: a consulta é confirmada **antes** de `confirmarSemCobranca`, que — ao contrário de `liberarReserva` — lança. Se falhar, sobra consulta confirmada de graça com resgate em aberto, que deixa de contar depois de 1h, e um 500 cru. E a rota **não escreve log**, onde o webhook escreve `Appointment X: confirmed` | Linha do resgate apagada entre a reserva e a confirmação (corrida com `descartarPorSessao`/DELETE do cupom). Improvável; o que sobra é: cortesia sem rastro nenhum no log do servidor |
| N-9 | baixa | `app/api/admin/coupons/route.ts:9-18` e os dois irmãos | `falhou()` diz *"Something went wrong **saving** that"* em duas rotas de **leitura**. E um POST que cria o cupom e tropeça no `logAudit` responde 500: o Bruno tenta de novo e lê *"The code X already exists here"* | GET da lista ou dos resgates falhando; ou `logAudit` indisponível no POST |
| N-10 | baixa | `lib/module-registry.ts:341-386,579-584` | `mod_lab`/`mod_clinica` entraram no registro **e** em `MODULE_CATEGORIES`, então aparecem como **feature de plano** em `/admin/memberships` e `/admin/service-pricing` (inclusive no "Select All"), onde marcar não faz nada: `/api/mobile/modules` lê `moduleOverrides`, nunca `computePatientAccess` | Bruno marca "Laboratory (app area)" num plano de assinatura e nenhum assinante ganha o laboratório. Dois lugares para a mesma chave, um decorativo |
| N-11 | baixa | `tsconfig.json` | `.next-local/types/**/*.ts` não é de nenhuma das duas frentes | — (só ruído no diff) |

### N-1 — provado: uma campanha de uso único vendida duas vezes ao mesmo paciente

`resolveCoupon` decide o limite **no instante da reserva** e, depois da correção, a reserva em aberto
do próprio paciente não conta nem no limite dele (`confirmedAt: { not: null }`) nem no da campanha
(`NOT: { patientId, confirmedAt: null }`). Como nada reconfere o limite na **confirmação** (o webhook
só faz `updateMany`), basta o paciente ter duas reservas vivas ao mesmo tempo para pagar as duas.

Harness com Prisma real, Postgres real, funções de produção. Cupom de 20%, `maxRedemptions: 1`,
`maxPerPatient: 1`:

```
=== C1: um paciente, DOIS escopos ===
1) consulta  : reservado  original 100 discount 20 final 80   (sessao cs_rev_s1)
2) sessao    : reservado  original  80 discount 16 final 64   (sessao cs_rev_s2)   <- não recusou
webhook s1 confirmou: 1
webhook s2 confirmou: 1
CONFIRMADOS: 2 (maxRedemptions=1, maxPerPatient=1)
3) depois de pagar os dois: {"ok":false,"reason":"already_used", ...}

=== C4: um escopo só, 2h entre os dois pedidos (a folha do Stripe vive 24h) ===
2o pedido, 2h depois: reservado  -> nova linha (fora da janela, não reaproveita)
paga a 1a folha  -> confirmou: 1
paga a 2a folha  -> confirmou: 1
CONFIRMADOS: 2 (maxRedemptions=1, maxPerPatient=1)
```

**C1 é alcançável com as telas de hoje:** `book-appointment.tsx` tem campo de cupom com escopo
`CONSULTATION`/`TREATMENT_SESSION` e `plans.tsx` tem com `MEMBERSHIP`. Um cupom que valha nos dois — e
a tela de criação oferece marcar quantos alcances quiser — é resgatado duas vezes por uma pessoa só,
sem tocar em nenhuma API na mão. **C4 precisa de uma tela só:** pede o pagamento, desiste, espera uma
hora, repete. Nos dois casos `maxPerPatient: 1` é o padrão que a T-2 grava, não uma configuração
exótica.

Respondendo às três perguntas do encarregado, na ordem:

- **A exclusão abre como furar `maxRedemptions`?** Abre — é o C1/C4 acima. Não é corrida: é sequencial
  e deliberado.
- **Um paciente consome uma campanha de uso único mais de uma vez em janelas diferentes?** Sim, C4. O
  reaproveitamento da reserva (`findFirst` com `createdAt >= agora - 1h` **e** o mesmo `scope`) é o
  único limite que sobrou, e ele tem duas frestas: escopo diferente e janela vencida.
- **`maxPerPatient` virou decorativo?** Não de todo: ele protege **depois** de o dinheiro entrar (C1,
  passo 3: `already_used`). Deixou de proteger **antes** — e o "antes" dura até 24h, que é a vida da
  folha do Stripe. Na prática ele mudou de "quantas vezes esta pessoa pode usar" para "quantas vezes
  ela pode usar *em série*".

Há um efeito colateral menor do mesmo desenho, que já existia e a correção deixou alcançável: no
**mesmo** escopo dentro da janela, a reserva é reaproveitada e a sessão antiga é desligada
(`stripeSessionId: null`), então pagar a **primeira** folha desconta o preço e **não** registra
resgate nenhum:

```
=== C2: mesmo escopo, duas consultas pendentes ===
mesma linha? true
paga a sessao A (a 1a folha, ainda viva) -> webhook confirmou: 0     <- desconto dado, resgate não contado
paga a sessao B                          -> webhook confirmou: 1
linhas: 1
```

O contador da campanha diz 1 e o desconto foi dado 2 vezes.

**Direção de correção** (não é uma linha): o limite tem de ser conferido onde o dinheiro entra, não só
onde a reserva nasce — reconferir em `confirmarPorSessao` e recusar/estornar é o que fecha C1, C2 e C4
de uma vez. Paliativos: contar, no limite do paciente, as reservas em aberto **de outro escopo**
(fecha C1); casar a janela da reserva com a vida da sessão do Stripe em vez de 1h (fecha C4); e um
índice único em `(couponId, patientId, scope)` para a corrida que a B-3 registrou e continua aberta.

### N-2 — a data, agora ao contrário

O B-5 dizia "a campanha morre um dia antes, e a tela escreve 30/09". Agora a campanha vive o dia 30
inteiro — correto — e a **tela** escreve 01/10:

```
endsAt gravado : 2026-09-30T23:59:59.999Z
janela() mostra: 01/10/2026        (TZ=Europe/London, BST)
hora local     : 01/10/2026, 00:59:59
dezembro (GMT) : 31/12/2026        <- no inverno acerta
```

Isto é, o rótulo mente durante o BST e acerta no GMT. O comportamento em si — o cupom aceito até
00:59 BST do dia 1º, e uma zona morta de 00:00 a 01:00 quando há `startsAt` — eu **aceito**: erra para
o lado generoso e por menos de uma hora. O rótulo, não: é a tela do Bruno dizendo uma data que ele não
digitou. Fuso da clínica (`Europe/London`) nos dois lados resolveria os dois.

Verifiquei o round-trip da edição, que era o risco óbvio: `c.endsAt.slice(0, 10)` sobre
`2026-09-30T23:59:59.999Z` devolve `2026-09-30`, então reeditar e salvar não empurra a data dia a dia.
Está certo.

## O que está bem resolvido

- **A-2 (cupom de 100% na consulta).** A confirmação na própria rota usa **a mesma guarda do webhook**
  (`status: "PENDING"` mais o `patientId` no `where`), e o `status !== "PENDING"` lá em cima faz o
  segundo toque virar `not_payable` em vez de confirmar duas vezes. Fui atrás do efeito colateral
  esquecido e **não há**: o ramo de consulta do webhook confirma o status, imprime uma linha de log e
  dá `break` — sem notificação, sem `ServiceAccess`, sem `Payment`, sem `Order`, e o webhook nem trata
  `payment_intent.succeeded`. O que a rota esquece é só o log (N-8). E o `url: null` cai certo no app:
  `if (url)` não entra, nada lança, e o fluxo segue para `booking-confirmed` —
  `startAppointmentCheckout` tem um consumidor só, então não há segunda tela para quebrar.
- **A-3 (£80 / month).** O sufixo agora diz *"on your first payment, then £50.00 / monthly"* e a
  versão PT, nas duas línguas, e só quando há cupom. É exatamente o que faltava.
- **`MINIMO_COBRAVEL` no pacote.** O guard fica **só** no caminho de cobrança única
  (`!preco.recurring`), que é o certo: na semanal o desconto vai como cupom da Stripe e o
  `unit_amount` fica cheio, então não há valor pequeno para recusar. E o valor comparado é o mesmo que
  vira `unit_amount` (`final` → `Math.round(final * 100)`).
- **As três rotas admin.** Li as chaves uma a uma: nenhum `return` ficou fora do `try`, nenhum bloco
  mal fechado (a indentação de dois espaços que sobrou depois de `const { clinicId } = guard.actor;` é
  cosmética), e o `catch` não engole nada que devesse ser 4xx — `validateCouponInput` roda antes e
  devolve 400 com frase. O 500 sem corpo da F1/F2 da T-2 morreu.
- **Data inválida e moeda inventada** recusadas na criação, com frase, antes do Prisma. E de graça o
  `limiteDoDia` consertou uma campanha de **um dia**: antes início e fim caíam os dois em 00:00Z e
  `fim <= inicio` recusava.
- **`ApiError`** não quebra consumidor nenhum: o 4º parâmetro é opcional, os cinco lugares que usam a
  classe leem `status`/`code`/`message`, e o `tsc` do `mobile/` fecha em 0. O que falta é alguém
  chamar `localizada()` (N-4).
- **Laboratório por paciente.** A hierarquia está certa nas quatro combinações, e conferi cada uma no
  código: liberado + geral desligado → aparece; negado (`false`/`"locked"`/`"hidden"`) + geral ligado →
  some, nos dois pontos; sem override + geral ligado → aparece; sem override + geral desligado + linha
  `DIAGNOSTICS` ligada → **não** aparece (o `semLab` final tira). A equipe
  (SUPERADMIN/ADMIN/THERAPIST) passa pelo mesmo `semLab`, com a mesma variável, então "esconder"
  continua escondendo de quem testa. O tenant de personal **retorna antes** de qualquer lógica de lab:
  estúdio não vê laboratório. E `labParaEste` é lido pelo filtro **e** pela concessão, o que torna
  impossível voltar o R1 da 083 (ligar e nada ligar). Os dois testes editados de `__tests__/labs`
  melhoraram: pararam de fixar a grafia antiga e passaram a afirmar a propriedade.
- **Não achei vazamento entre clínicas** em nenhuma das duas frentes. O laboratório é decidido pelo
  `moduleOverrides` da própria linha do usuário e pelo `labVisibleInApp` da clínica **dele** (Bearer,
  sem cookie de clínica selecionada); o cupom continua com o tenant dentro do `findUnique`.

## Os testes novos (item 8)

Os que **executam** código e provam algo: os casos de `limiteDoDia` e `validateCouponInput` em
`correcoes-qa.test.ts`, `MINIMO_COBRAVEL === 0.3`, e os de `resolve.test.ts`/`redemption.test.ts` que
invocam as funções de verdade. O mock contraditório que a rodada anterior apontou
(`redemption.test.ts:107-114`) **foi corrigido**, e com um comentário explicando por quê — é a melhor
coisa desta rodada nos testes.

O problema é o que eles afirmam:

- `resolve.test.ts` — *"o segundo toque do mesmo paciente NÃO é recusado"* mocka `count → 0` e afirma
  `r.ok === true`. **Este teste fixa como desejado exatamente o comportamento que o N-1 explora**: com
  `count` cravado em 0, o mock não consegue distinguir "reaproveitou a reserva" de "criou a segunda".
  A rodada anterior pediu um teste que rodasse `reservarCupom` duas vezes contra um prisma que
  **guardasse** as linhas; não foi feito, e é o único jeito de este teste virar guarda em vez de
  carimbo. Os dois `toEqual` sobre o `where` fixam a grafia do filtro, não a regra.
- `correcoes-qa.test.ts` — asserções que passariam com o código errado:
  `toContain("confirmarSemCobranca")` (uma menção em comentário satisfaz); a varredura de "deixou de
  ser código morto" aceita a string em **qualquer** `.ts` de `app/` ou `lib/`, comentário incluído;
  `toContain("MINIMO_COBRAVEL")` é satisfeito pelo **import** — o guard poderia ter sido removido, ou
  ficar depois da chamada à Stripe, e o teste passa; `/url: null/`, `/covered: true/` e
  `/status: "PENDING", patientId: userId/` são grafia; `toMatch(/if \(url\) \{/)` no app existia
  **antes** da mudança e não diz nada sobre o caminho do `null`; o regex do `try/catch` passa se **um**
  handler do arquivo casar, e `[id]/route.ts` tem dois (PATCH e DELETE) — um `catch` quebrado no
  DELETE não seria visto; as duas asserções da tela (`/\) : erro \? \(/`) são JSX literal. E
  `toMatch(/localizada\(lang: string\)/)` fica **verde sobre código morto**: é a assinatura de um
  método sem consumidor (N-4).
- `per-patient-lab.test.ts` — 100% leitura de texto. Nenhuma das três coisas que importam está
  coberta: o caminho da equipe, o retorno antecipado do tenant de personal e a ausência de vazamento
  entre clínicas. `not.toMatch(/labOn &&/)` e `match(/const overrides = /g).length === 1` são travas de
  grafia que quebram numa edição inofensiva. E o `slice(i, i + 900)` transborda para a entrada seguinte
  do registro: um `defaultGranted` acrescentado em `mod_clinica` reprovaria o caso do `mod_lab`.

## Hipóteses que investiguei e descartei (16)

1. O `NOT` do Prisma virando lógica de três valores e excluindo as linhas de **outros** pacientes →
   não; C3 mostra B recebendo `limit_reached` com a reserva de A em aberto.
2. A exclusão desfazendo a corrida entre dois pacientes, que é a razão da T-4 → segue de pé (C3).
3. O webhook fazendo pela consulta algo que a cortesia esquece (notificação, `ServiceAccess`,
   `Payment`, `Order`) → não faz; confirma o status, loga e `break`.
4. `payment_intent.succeeded` criando `Payment` para consulta → o webhook não trata esse evento.
5. Duplo toque na cortesia confirmando duas vezes → `status !== "PENDING"` responde 409 antes.
6. `url: null` deixando o app numa tela morta → cai em `booking-confirmed`; um consumidor só.
7. O 4º parâmetro do `ApiError` quebrando consumidor → cinco consumidores, todos por
   `status`/`code`/`message`; `mobile/` compila em 0.
8. A edição empurrando a data um dia a cada salvamento → `slice(0, 10)` devolve `2026-09-30`.
9. `mod_lab` liberado mostrando o laboratório de **outra** clínica → lista montada da linha do próprio
   usuário e da clínica dele; nada por header, nada por cookie de clínica.
10. Aluno de estúdio ganhando laboratório pelas entradas novas do registro → `isPersonalTenant`
    retorna antes.
11. As duas entradas com `href: ""` envenenando `HREF_MODULE_MAP` e a sidebar do paciente → os dois
    consumidores filtram por `m.href`.
12. O guard do mínimo faltando no pacote semanal → correto faltar: lá o desconto é cupom da Stripe.
13. `maxPerPatient: 0` passando pela validação → recusado com frase.
14. O "só o interruptor" do PATCH deixando passar outro campo sem validação →
    `Object.keys(body).length === 1` mais `typeof boolean`.
15. Os dois erros de `tsc` do webhook serem novos → nas linhas que o diff não toca.
16. `limiteDoDia` quebrando a comparação `fim <= inicio` → ao contrário: destravou a campanha de um
    dia, que antes era recusada.

## O que eu faria antes de deployar

1. **N-1**, e é a única coisa que bloqueia: reconferir o limite na confirmação do webhook, não só na
   reserva. Com um teste que rode `reservarCupom` duas vezes contra um prisma que **guarde** as
   linhas — o mesmo teste que falta desde a rodada anterior, e que teria pegado isto.
2. **N-3** e **N-2**: duas frases e um `toLocaleDateString`. As duas mentem para o Bruno na tela dele,
   e uma delas mente sobre o limite que ele acabou de configurar.
3. **N-4**: alguém chamar `localizada()`, e a tela de marcar mostrar o motivo da recusa em vez de
   *"Marcado, ainda não pago"* — ou a aba Appointments ganhar o botão de pagar que a frase promete.
4. **N-5**: recusar 100% na criação para pacote e plano de tratamento, ou uma frase própria para
   "zero" que não mande pedir o que a pessoa já tem.
5. **N-10**: tirar `app_areas` das telas de feature de plano, ou fazer `computePatientAccess` valer
   para as áreas do app. Um interruptor que não interrompe nada é pior que interruptor nenhum.

*Nota de ambiente:* o Postgres local é compartilhado (a F-5 do `report-t-3-t-4.md`). O que eu criei
(`REV084-AUDIT` e seus resgates) foi apagado; os 2 `CouponRedemption` que restam no banco não são meus
e não foram tocados.
