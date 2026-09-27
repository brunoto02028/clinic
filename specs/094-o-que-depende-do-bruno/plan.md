# Atividade 094 — O que depende do Bruno

**Aberta em:** 27/09/2026
**Pedido:** *"Guarda numa nova SPEC tudo isso que depende de mim ok?"*

Esta atividade não tem tarefas minhas. É o **registro do que está parado
esperando uma pessoa** — conta de empresa, menu interativo da Apple, chave que
não pode passar por conversa. Cada item diz o que trava, quem faz, e como saber
que ficou pronto.

Enquanto um item aqui estiver aberto, a funcionalidade que ele trava **existe em
código e não funciona na vida real**. Isso é diferente de "não está pronto", e a
diferença importa na hora de decidir o que publicar.

## Quadro

| # | o que falta | trava o quê | onde se faz |
|---|---|---|---|
| B-1 | **Conta Stripe live da BPR** | toda cobrança em produção | dashboard.stripe.com |
| B-2 | **`STRIPE_WEBHOOK_SECRET` + endpoint** | fatura e consulta pagas ficarem em aberto para sempre | Stripe → Developers → Webhooks, depois Coolify |
| B-3 | **Logo e cores no painel do Stripe** | invoice e Checkout saírem sem a marca da BPR | Stripe → Settings → Branding |
| B-4 | **Autorizar o build do app** | a tela de fatura e tudo que é nativo novo | você me diz, eu rodo |
| B-5 | **Merchant ID da Apple (Apple Pay)** | o botão do Apple Pay na folha de pagamento | portal da Apple + Stripe |
| B-6 | **DPA com a Daily** | a videochamada estar em ordem para dado de saúde | daily.co, contrato |
| B-7 | **Decisão: a segunda cópia dos termos** | o `ConsentLog` dizer a verdade sobre o que a pessoa leu | decisão sua, execução minha |
| B-8 | **Sandbox da LML** | comprar exame de laboratório (081 T-5..T-9) | LML, comercial |
| B-9 | **Stripe Connect do personal** | o aluno pagar o treinador (028) | Stripe Connect |

---

## B-1 — A conta Stripe live da BPR

**Como está.** Só existe o sandbox `acct_1UKJBCBQqxpn4tOB`, que **é da BPR**
(nome "BPR Physical Rehabilitation sandbox", url bpr.clinic) — nada de Kingdom,
que é só o time da Apple. A chave do `.env` é `sk_test_`.

**Produção está sem chave Stripe nenhuma, de propósito.** Chave de teste lá
confirmaria consulta e fatura de verdade com cartão de brinquedo.

**O que fazer.** Abrir/ativar a conta live sob a entidade que recebe o dinheiro,
conferir em Settings → Business que o company number é o da Bruno Physical
Rehabilitation, e em Bank accounts que a conta de payout é dessa empresa. Depois
pôr `STRIPE_SECRET_KEY` e `STRIPE_PUBLISHABLE_KEY` **live** no Coolify — pelo
painel ou me passando por lá, **nunca na conversa**.

**Pronto quando:** uma cobrança de £1 real cai na conta e aparece no extrato.

## B-2 — O webhook

**Como está.** `STRIPE_WEBHOOK_SECRET` vazio, e a conta tem **zero** endpoints
cadastrados (conferido em 27/09).

**Por que é grave.** Quem marca consulta como confirmada e fatura como paga é o
webhook. Sem ele o dinheiro entra no Stripe e **a consulta fica PENDING e a
fatura fica em aberto para sempre** — o pior estado possível: cobrou e não
entregou.

**O que fazer.** Na conta **live**, criar o endpoint `https://bpr.clinic/api/webhooks/stripe`
com os eventos `checkout.session.completed`, `payment_intent.succeeded`,
`invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`.
Copiar o *signing secret* para `STRIPE_WEBHOOK_SECRET` no Coolify.

**Não cadastre endpoint de teste apontando para bpr.clinic** — é a mesma
armadilha da chave de teste em produção.

**Pronto quando:** pagar uma fatura de teste e ela virar "Paga" sozinha em até
um minuto.

## B-3 — A marca no painel do Stripe

**Como está.** Vazio: `branding.logo = null`, cores nulas.

**Por que não dá por código.** O Stripe responde **403** a qualquer mudança na
conta da própria plataforma — conferido nos três caminhos (`/v1/account`,
`/v1/accounts/<id>` e upload de File). A tela `/admin/stripe-branding` agora só
lê e aponta para lá, em vez do botão que voltava 400.

**O que pôr:** logo = o logo da BPR; ícone = `favicon.png` (o quadrado — o
Stripe corta imagem retangular); cor = `#4F7361`. E o *public business name* sem
a palavra "sandbox" na conta live.

**Pronto quando:** um recibo de teste sai com o logo.

## B-4 — Autorizar o build do app

**O que está esperando.** A tela de faturas (093) usa módulo nativo novo
(`@stripe/stripe-react-native`). O fingerprint mudou, então **nenhum `eas update`
alcança o binário instalado** — só chega com build novo.

**A regra continua valendo:** eu não rodo `eas build` sem você pedir.

**Antes de pedir**, decida se B-5 entra no mesmo build (ver abaixo), porque ligar
Apple Pay depois obriga a outro.

## B-5 — Merchant ID da Apple, para o Apple Pay

**Como está.** O PaymentSheet já sobe com cartão nativo nos dois sistemas e com
Google Pay no Android. O botão do **Apple Pay** só aparece com um Merchant ID
registrado.

**O que fazer:** criar `merchant.com.bpr.clinic` no portal da Apple, gerar o
certificado de processamento pelo Stripe, e ligar a capability Apple Pay no
identificador do app.

**Cuidado conhecido:** capability nova **invalida o provisioning profile**, e o
menu do EAS é interativo — já aconteceu com push e HealthKit. Precisa de você na
frente do terminal, ou o build quebra.

## B-6 — DPA com a Daily

A consulta por vídeo já roda em produção, em sala privada, com token curto, sem
gravação. O que falta é o **contrato**: a Daily processa dado de saúde da sua
clínica, e um DPA assinado é o que põe isso em ordem.

## B-7 — A segunda cópia dos termos (decisão sua)

**O achado.** `/dashboard/consent` — a tela onde o paciente **aperta o botão** —
não lê `lib/terms-content.ts`. Ela busca `/api/admin/consent-texts`, uma segunda
cópia com **18 itens**, editável em `/admin/patient-portal`. As duas cláusulas
novas da 1.3 (quem você cuida, e o vídeo não é gravado) **não estão lá** — e é
ali que o aceite grava `termsVersion: "1.3"`.

Ou seja: o registro diz que a pessoa aceitou a 1.3, e ela leu outro texto.

**As opções:**
1. A tela passa a ler a mesma fonte que `/terms` e o app — some a cópia editável;
2. a cópia editável continua, mas o aceite grava a versão **dela**;
3. fica como está.

A 1 é a que eu faria, e é uma tarefa pequena. Precisa da sua palavra porque
apaga uma tela de edição que existe hoje.

## B-8 — Sandbox da LML

Sem o token, a 081 para na T-5: catálogo é vitrine e a compra fica fechada por
`LAB_ORDERING_ENABLED`.

## B-9 — Stripe Connect do personal

A cobrança do aluno (028) está em produção e fechada. Depende de ativar o Connect
e rodar um QA em modo de teste.

## Como usar esta spec

Quando um item sair, me diga qual — eu faço a metade que é código (variável no
Coolify, teste em produção, QA online) e marco aqui. Nada nesta lista se resolve
sozinho com o tempo.
