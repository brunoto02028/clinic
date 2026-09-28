# Atividade 084 — Cupom de desconto

**Status:** em andamento — aprovada em 26/09/2026
**Data:** 26/09/2026

## Objetivo

O Bruno: *"cupom de desconto eu quero configurar sim e ter a liberdade"*. Ele já tem preço por
paciente (082) — o que falta é a outra forma de descontar: **um código**, que uma pessoa digita,
que vale por um tempo, que pode ser para todos ou para um só.

As duas não se substituem. O preço por paciente é uma decisão da clínica sobre alguém;
o cupom é uma campanha — tem prazo, tem limite, e a pessoa participa dela digitando algo.

## O que existe hoje

| o quê | estado |
|---|---|
| Preço por paciente (`PatientServicePrice`) | ✅ 082 |
| `sessionDiscount` no plano (% em sessões) | ✅ existe, é benefício de assinatura |
| `discountPercent` no `TreatmentType` | ✅ existe, é do tipo de tratamento |
| `Order.discountCode` | ⚠️ **texto livre** — grava um código que nada emite e nada valida |
| Cupom de verdade | ❌ não existe |
| `allow_promotion_codes` do Stripe | ❌ não usado em nenhum dos 10 checkouts |

## Decisões de design

### 1. O cupom é nosso, não do Stripe

O Stripe tem cupom pronto e ligar custa uma linha (`allow_promotion_codes: true`). Recusado por
três motivos:

- **O app mostraria £100 e o Stripe cobraria £80.** É exatamente a falha N4 da 080 — a tela
  promete um preço e o servidor cobra outro. O desconto tem de aparecer *antes* de pagar.
- **Não alcança o que é grátis.** Plano gratuito e pacote cortesia não passam pelo Checkout.
- **Mirar num paciente ficaria fora do painel.** A clínica administra preço em `/admin`; o cupom
  não pode morar noutro site.

Nós calculamos, e passamos ao Stripe **o valor final**.

### 2. Um lugar resolve o desconto, não dez

Há **dez** rotas que criam um Checkout hoje. Um cupom costurado em cada uma são nove chances de
esquecer — e a que esquecer cobra o preço cheio de quem tinha o código.

Então o cupom entra na camada que **já** responde "quanto custa": junto de
`servicePricesForPatient` (082). Uma função (`applyCoupon`), um resultado
(`{ original, discount, final, couponId }`), e quem cobra usa o `final`.

### 3. O paciente vê o desconto antes de pagar

Campo de código na tela, e o preço se reescreve na frente dele: **£100 → £80**, com o nome da
campanha. Nada de desconto silencioso, e nada de "cupom aplicado" sem dizer quanto.

### 4. O resgate é gravado uma vez, e ocupa a vaga enquanto o cartão passa

Dois toques no botão não descontam duas vezes: `find-then-write` sobre a reserva em aberto, como o
resto do código desde a F2 da 080.

**Corrigido na T-4:** a T-1 contava para o limite só o resgate **confirmado**, e isso deixava passar
uma corrida real — dois pacientes abrem o Checkout do mesmo cupom de uso único, os dois pagam, e a
campanha vende duas vezes. Agora conta o confirmado **ou** a reserva feita na última hora
(`JANELA_RESERVA_MS`): quem está pagando agora ocupa a vaga, e quem abandonou a devolve quando a
janela passa. Sem a janela, uma aba fechada prenderia a campanha para sempre.

### 4c. A reserva é de **uma compra**, não de um tipo de compra

O conserto do R-1, e o terceiro round do mesmo lugar. A chave do reaproveitamento era
(cupom, paciente, escopo) — então duas consultas pendentes pareciam dois toques na mesma, e um cupom
de um uso por paciente pagava as duas com desconto registrando **um** resgate. `CouponRedemption`
ganhou `targetId` (o id da consulta, do pacote, do plano), e a chave passou a ser
(cupom, paciente, escopo, **compra**).

Junto veio o que eu tinha suposto e não era verdade: a sessão anterior "morria com o toque
anterior". Não morria — seguia pagável com o desconto pelas 24h de vida dela. Agora ela é
**expirada na Stripe** quando a reserva é reaproveitada, em melhor esforço.

### 4b. O que é recorrente não desconta o `unit_amount`

Descoberto escrevendo a T-4. A assinatura usa um `price` do catálogo da Stripe, e o pacote semanal
usa um preço recorrente inline — nos dois, baixar o `unit_amount` descontaria **toda** mensalidade,
para sempre. Então ali o desconto entra como cupom da Stripe com `duration: "once"`, e o id é
determinístico (`bpr-pct-CODIGO-20`): um objeto por código e valor, em vez de um por adesão.

### 5. O cupom não alcança o exame de laboratório

Decisão do Bruno, 26/09/2026: *"os exames eu não vou ter cupom de desconto. Apenas para consulta
da clínica e plano de pacote de tratamento."*

A razão de fundo confirma a decisão. Em 081 nós revendemos: a LML cobra o custo, nós vendemos a
preço de mercado, a diferença é nossa. Um cupom de 30% num exame não desconta o laboratório —
desconta a margem, e pode passar dela. Deixar o exame de fora **elimina** o piso de custo, a
conferência de margem por produto e a recusa por prejuízo: nada disso precisa existir.

`LAB_TEST` não entra no `CouponScope`. A rota de checkout do exame recebendo um `code` **ignora e
cobra cheio** — nunca desconta por acidente, e nunca precisa saber o que é um cupom.

### 6. A T-3 sozinha não vai para produção

Entre a T-3 e a T-4 o app mostra £80 e o servidor cobra £100: a tela carrega o código, e quem o
honra é o checkout da T-4. É o defeito que esta atividade inteira existe para evitar, então o par
**T-3 + T-4** é a menor unidade que pode ser deployada. Registrado aqui porque a ordem das tarefas
esconde isso.

### 7. O cupom nunca é obrigatório para ter o preço certo

Quem não digita nada paga o preço da 082. O cupom é um a mais, nunca um pré-requisito.

## Tarefas

| T-N | nome | depende de | status |
|---|---|---|---|
| T-1 | Modelo do cupom, validação e resolução num só lugar | — | **concluída** (QA 14/14, review aprovado) |
| T-2 | Tela do cupom no painel da clínica | T-1 | **concluída** (QA 11/11, 6 achados corrigidos) |
| T-3 | Campo de código no app, com o preço se reescrevendo | T-1 | implementada · telas do app não executáveis (alvo web do Expo quebrado) |
| T-4 | Resgate no checkout: dez portas, uma regra, idempotente | T-1, T-3 | implementada · QA aprovado com ressalvas |

## Suposições

1. **Percentual ou valor fixo**, um dos dois por cupom — não os dois somados.
2. **Alcance:** uma lista de tipos — `CONSULTATION`, `TREATMENT_SESSION`, `PACKAGE`,
   `TREATMENT_PLAN`, `MEMBERSHIP`. Sem lista = não vale para nada, e a tela não deixa salvar
   assim. **Exame de laboratório não é um alcance possível** (decisão 5).

   `TREATMENT_PLAN` entrou na T-1, e é um acréscimo meu ao que estava escrito aqui: existem
   **duas** compras de tratamento no código, `/api/patient/packages/checkout` (pacote de sessões)
   e `/api/patient/treatment-plans/checkout` (plano de tratamento), e o Bruno disse "plano de
   pacote de tratamento". Com quatro alcances o cupom nasceria cego para uma das duas. Se a
   intenção era só uma delas, tirar é uma linha.
3. **Mira:** cupom aberto (qualquer paciente da clínica) **ou** de um paciente só — o mesmo par
   de opções da 082, porque é a mesma pergunta: *para quem isto vale?*
4. **Limites:** janela de validade (início opcional, fim opcional), máximo de resgates no total,
   máximo por paciente (padrão 1).
5. **Código em maiúsculas, comparado sem diferenciar caixa.** `verao10` e `VERAO10` são o mesmo
   cupom; o paciente digita como quiser.
6. **Um cupom por compra.** Acumular dois é uma conta que ninguém confere.
7. **Cupom não incide sobre assinatura já ativa** — vale na adesão. Mudar mensalidade em curso é
   mexer na `Subscription` do Stripe, e isso é outra atividade.
8. **Desconto de 100% é válido** — cortesia com código, e o checkout é pulado como já acontece
   quando o preço é zero.
9. **Quem cria é SUPERADMIN**, como o preço por paciente (082, suposição 3 resolvida).
10. **Migração aditiva:** dois modelos novos e nenhuma coluna alterada. `prisma migrate diff`
    contra o `main` tem de dar zero DROPs.

## Fora do escopo

- Cupom que gera link/QR pronto para campanha.
- Cupom de indicação (um paciente traz outro) — depende de rastrear a indicação, que não existe.
- Cupom em cima de `sessionDiscount` do plano (ver suposição 6).
- **Exame de laboratório** — decisão 5, não é omissão.
- Migrar o `Order.discountCode` de texto livre: fica, e o cupom novo passa a preenchê-lo.
