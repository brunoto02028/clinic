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
| G-1..G-7 | **O login com Google e Apple** — clientes Android e iOS, os três SHA-1, publicar a tela de consentimento, capability da Apple, domínio do relay, variáveis no Coolify | a [[097-entrar-com-google-e-apple]] inteira | Google Cloud Console, Apple Developer, Coolify |

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

---

## G — O login com Google e com Apple (28/09)

Detalhado em [097-entrar-com-google-e-apple](../097-entrar-com-google-e-apple/plan.md).
O Google Cloud Console já tem a tela de consentimento e o **cliente Web**, feitos
por você em 27/09. Falta:

| # | o que falta | por que trava |
|---|---|---|
| ~~**G-2**~~ | ~~Client ID **iOS**~~ — **feito em 28/09**, no navegador, com você logado | — |
| **G-7** | `GOOGLE_CLIENT_SECRET` no Coolify (os dois Client ID eu ponho no push) | **sem ele o botão não aparece na web** |
| **G-4** | **Publicar a tela de consentimento** (sair de "Testing") | só usuários de teste conseguem entrar |
| **G-5** | Capability **Sign in with Apple** no App ID | e ela **invalida o provisioning**: menu interativo, precisa de você |
| **G-6** | Domínio `bpr.clinic` em *Sign in with Apple for Email Communication* | e-mail da clínica não chega a quem esconder o endereço |
| **G-1** | Client ID **Android** (`com.bpr.clinic` + SHA-1) | o botão do Google **não aparece no Android** até isso existir |
| **G-3** | Os **três SHA-1**: debug, upload key e **App signing key do Play** | sem o terceiro, funciona no teste e **quebra na loja** (`DEVELOPER_ERROR`) |

### O que eu já fiz, e o que sobrou para você

**G-2 está feito.** O cliente iOS existe no projeto `rb-rehab`:

```
48914887762-6k58gs99rmivdvv9uevk5t1sv5qjerhj.apps.googleusercontent.com
```

Client ID **não é segredo** — ele viaja dentro do aplicativo, por desenho. Ele
já está no código do app e no `.env` local. O que **é** segredo é o
`GOOGLE_CLIENT_SECRET` do cliente Web, e ele nunca passa por aqui: você o cola
direto no Coolify.

**G-7, exatamente o que pôr no Coolify:**

| variável | valor |
|---|---|
| `GOOGLE_CLIENT_ID` | `48914887762-n5snld1ogr1et1djpmp7m3rkurk4e6c6.apps.googleusercontent.com` |
| `GOOGLE_IOS_CLIENT_ID` | `48914887762-6k58gs99rmivdvv9uevk5t1sv5qjerhj.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | **o segredo do cliente Web** — copie do Console, cole no Coolify |
| `APPLE_CLIENT_ID` | `com.bpr.clinic` |

Sem `GOOGLE_CLIENT_SECRET` o provedor da web não é montado e o botão some de
`/login` — que é o comportamento de hoje. O **app** não depende dele: ele usa
`GOOGLE_CLIENT_ID` e `GOOGLE_IOS_CLIENT_ID` só para conferir o `aud`.

**G-1 e G-3 não têm como ser feitos ainda**, e não é teimosia: o cliente Android
é casado com o SHA-1 do certificado que assina o APK, **não existe build Android
nenhum** no EAS (conferi: a lista voltou vazia), logo não existe keystore, logo
não existe SHA-1 para registrar. Por isso o botão do Google **não aparece no
Android** nesta versão — um botão que só pode falhar é pior que nenhum botão. É
uma linha de código e um build para ligar, no dia em que o Android for sair.

### G-5 — o que o build já tentou, e onde parou (28/09, 08:47)

**Isto é a única coisa entre você e o app novo no TestFlight.** Tudo o mais
está pronto: o build subiu, compilou, e morreu na assinatura com

```
Provisioning profile "*[expo] com.bpr.clinic AppStore 2026-09-24T08:24:50.705Z"
doesn't include the Sign In with Apple capability.
doesn't include the com.apple.developer.applesignin entitlement.
```

É exatamente o que a nota antiga previa: **capability nova invalida o
provisioning**. O perfil que a EAS guarda é de 24/09 e não conhece o *Sign in
with Apple*, que passou a existir agora.

**O que resolve, e leva dois minutos seus** — o menu é interativo, e por isso
não dá para eu rodar:

```
cd <repo>/mobile
npx eas-cli credentials -p ios
```

1. escolher o perfil **production**
2. **Build Credentials: Manage everything needed to build your project**
3. **Provisioning Profile: Set up a new provisioning profile**

A EAS já tem a chave da App Store Connect guardada, então ela liga a capability
no App ID e gera o perfil sozinha — não deve pedir senha da Apple. Depois:

```
npx eas-cli build --platform ios --profile production
```

Se preferir, me chame que eu conduzo — só preciso de você na frente do terminal
para o menu.

**G-8 — a chave `.p8` da Apple, que apareceu agora.** A Apple exige que todo
app que oferece *Sign in with Apple* **e** exclusão de conta **revogue o token
do lado dela** quando a pessoa apaga a conta. Isso é uma chamada à API da Apple
assinada com uma chave privada `.p8` que só você pode gerar (Apple Developer →
Keys → *Sign in with Apple*). Preciso do arquivo, do **Key ID** e do Team ID.

Sem ela, o resto da exclusão funciona: o acesso acaba, os vínculos com Google e
Apple são apagados, o prontuário fica sob retenção. O que falta é o aviso à
Apple — e é item de revisão da loja.

**Uma pendência da sua spec já está resolvida:** *"package name e Bundle ID
definitivos"* — são `com.bpr.clinic` nos dois, e o app já está no TestFlight com
eles. Pode riscar.

**E a decisão sua:** eu segui a **sua spec** — *não vincular automaticamente*.
Quem entra pelo Google e já tem conta com aquele e-mail recebe uma frase
pedindo a senha uma vez; depois disso o vínculo se cria sozinho. A web passou a
responder igual. Se você preferir o contrário, é uma troca pequena e eu faço.
