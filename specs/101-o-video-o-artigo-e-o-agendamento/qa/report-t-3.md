# QA — 101 T-3: a clínica marca, o paciente paga, e está confirmado

**Data:** 28/09/2026
**Onde:** local, `npx next dev`, banco local, **Stripe de verdade** (chave de teste)
**Paciente:** `Qa095b Paciente` — paciente de teste identificado.
**Tokens e cookies:** nenhum valor neste relatório.

---

## O que já existia, e o que faltava

Quase tudo estava pronto: a rota que abre o pagamento
(`/api/patient/appointments/[id]/checkout`), a folha do Stripe dentro do app
(`openCheckout`), e o webhook que move a consulta para `CONFIRMED` quando o
dinheiro entra.

**Faltava a porta.** `startAppointmentCheckout` só era chamado no instante em
que o **paciente** marcava — então uma consulta marcada pela **clínica** chegava
ao telefone sem dizer que esperava alguma coisa, e sem botão nenhum. Ela ficava
pendente para sempre.

---

## 1. Como a consulta nasce — medido

Três criadas pela rota da clínica, com o painel logado:

| o que a clínica escolheu | `status` | `paymentMethod` | `price` | `checkoutUrl` |
|---|---|---|---|---|
| Pagar online, £60 | **PENDING** | ONLINE | 60 | null |
| Pagar na clínica, £60 | **PENDING** | IN_PERSON | 60 | null |
| Isenção (cortesia) | **CONFIRMED** | ONLINE | 0 | null |

Três coisas que isto prova:

### 1.1 `paymentMethod` passou a ser gravado — **era um furo**

`paymentMode` decidia se um link nascia e o que o e-mail dizia, e **morria na
requisição**: a linha ficava com o padrão `ONLINE` mesmo quando a clínica
escolheu "na clínica". As duas escolhas viravam a mesma coisa para quem lê
depois — e é deste campo que o app decide se oferece cartão.

### 1.2 Cortesia nasce confirmada — **era um beco**

`price = 0` ficava `PENDING` para sempre: o app ofereceria pagar, o servidor
responderia "nada a pagar", e a consulta não sairia do lugar. **Sem pagamento
não há o que confirmar**, então quem confirma é quem marcou.

### 1.3 Nenhuma sessão do Stripe nasce na marcação — **era um risco de cobrar duas vezes**

A marcação criava uma sessão de Checkout **e** uma linha de `Payment`, e mandava
o link por e-mail. Com o paciente pagando pelo app, isso vira **duas sessões
vivas da Stripe para a mesma consulta**, as duas cobráveis. O webhook confirma
uma vez só — `updateMany` com `status: "PENDING"` no `where` — mas o dinheiro
entraria duas.

Agora a sessão nasce **sob demanda**, no toque em pagar. Uma porta de cada vez,
e o valor recalculado na hora em vez de congelado na marcação.

---

## 2. O que o app recebe — medido pelo bearer do paciente

```
QA T-3 cortesia     status=CONFIRMED paymentMethod=ONLINE    price=0    -> nada_a_pagar
QA T-3 online       status=PENDING   paymentMethod=ONLINE    price=60   -> espera_cartao
QA T-3 presencial   status=PENDING   paymentMethod=IN_PERSON price=60   -> paga_na_clinica
```

A última coluna é `estadoDoPagamento` de `mobile/src/lib/pagamento-da-consulta`
— a mesma função que a lista e a tela da consulta usam. Três telas faziam a
mesma pergunta; a resposta mora num lugar só, porque três cópias divergem (foi
o que aconteceu com a língua do material na T-2, no mesmo dia).

---

## 3. Pagar, e com isso confirmar

| # | cenário | resultado |
|---|---|---|
| 3.1 | abrir o pagamento da consulta pendente | **200**, URL real do Stripe Checkout (443 chars) |
| 3.2 | abrir o pagamento da cortesia | **409** `not_payable` |
| 3.3 | forçar cartão numa "paga na clínica" | **409** `paid_in_person` |

### 3.3 era uma porta aberta

A tela esconde o botão quando a consulta se paga na clínica — e **esconder botão
não é fechar porta**. Sem a guarda, uma consulta que a clínica marcou como "paga
na clínica" ainda podia ser cobrada por cartão, contrariando quem marcou. E
`IN_PERSON` é também o que a sessão de pacote usa, justamente porque ela **já foi
paga**: cobrar de novo seria cobrar duas vezes pela mesma sessão.

### E a confirmação

```
antes                            : PENDING
1º evento                        : count = 1
depois                           : CONFIRMED
2º evento (reenvio da Stripe)    : count = 0
```

Depois disso, o app relê a lista e a consulta sai de `espera_cartao` para
`resolvido` — ninguém precisa confirmar nada à mão.

**O que isto não mediu:** `STRIPE_WEBHOOK_SECRET` está vazio localmente, então o
caminho **assinado** do webhook não rodou. O que rodou foi a mesma escrita que
ele faz, com as mesmas guardas (`status: "PENDING"` e `patientId` no `where`).
A verificação de assinatura é código não tocado nesta tarefa.

---

## 4. A clínica sabe que está esperando o paciente

`PENDING` é a tarja de quem espera pagamento **e** de quem pediu horário e
espera aprovação. São duas esperas diferentes, e quem liga para o paciente
precisa saber qual é.

Medido na agenda:

```
QA T-3 hoje online   Mon 28 Sept  19:41  £75  Waiting for payment  | Confirm | …
QA T-3 hoje clinica  Mon 28 Sept  19:41  £75                       | Confirm | …
```

📷 `screenshots/agenda-esperando-pagamento.png`

E a tela de marcar passou a dizer a verdade: o rótulo era *"Link de pagamento
por email"* e virou *"O paciente paga pelo app"*, com a frase *"A consulta
aparece no aplicativo do paciente esperando £X. O pagamento é o que a confirma."*

**O e-mail deixou de ser obrigatório.** Ele era forçado no pagamento online
porque era o único veículo do link. Sem link, volta a ser o que os outros são:
opcional e com prévia — que é a regra da casa. A consulta não depende dele para
chegar; ela aparece no app assim que existe.

---

## 5. O que a suíte passou a proteger

`__tests__/agenda/a-clinica-marca-o-paciente-paga.test.ts` — 25 asserções: como
a consulta nasce, quem confirma, `paymentMethod` gravado, nenhuma sessão na
marcação, a regra de pagamento nos seis estados, o botão na tela, o aviso na
lista, e as duas esperas separadas na agenda.

**Verificado por sabotagem:** tirei `status: nascePaga ? …` e `paymentMethod: …`
da criação —

```
Tests: 2 failed, 21 passed
```

Restaurado, volta a passar.

---

## 6. Uma caçada que valeu a pena anotar

Durante o QA a agenda mostrava **zero consultas** e o console dizia só
`Invalid or unexpected token`, sem arquivo e sem pilha. Eu já tinha atribuído
esse sintoma a `.next` corrompido mais cedo hoje — **e estava errado**.

A medição:

```js
await (await fetch('/_next/static/chunks/app/layout.js')).text()            // 458.596
await (await fetch('/_next/static/chunks/app/layout.js',{cache:'no-store'})).text()  // 2.142.258
```

Em dev, o Next serve `/_next/static/chunks/*` como
`cache-control: public, max-age=31536000, immutable` — e **a URL do chunk não
tem hash**. O navegador guardou uma cópia truncada por um ano e passou a servi-la
sempre. Limpar o cache do navegador resolveu na hora, com a mesma porta.

Em produção isto está correto: lá a URL leva hash de conteúdo. É um pé-de-cabra
só do modo dev, e explica também por que "subir numa porta nova" parecia curar —
porta nova é origem nova, cache vazio.

---

## 7. Provas de sanidade

```
npx tsc --noEmit            → 0 erros (web)
npx tsc --noEmit (mobile)   → 0 erros
npx jest                    → 151 suítes, 2192 testes, tudo verde
npm run build               → compilou
```

---

## 8. O que eu não medi, e o que não mexi

1. **As duas telas do app não foram vistas rodando.** O que existe aqui é o
   contrato do servidor medido de ponta a ponta e as asserções sobre a ligação
   das telas. Ver o botão exige um build, e build é decisão sua.
2. **O `therapistId` continua sendo quem marcou.** Numa clínica com mais de um
   terapeuta isso está errado — e decide quem entra na sala de vídeo. É a
   suposição 1 do `plan.md`, e continua aberta.
3. **Quem paga pela web** perdeu o link do e-mail. É deliberado: o app é o alvo
   do paciente, e duas portas de cobrança para a mesma consulta é pior que uma.

---

## Veredito

**Aprovado, com quatro correções** — três delas furos que já existiam:
`paymentMethod` que não era gravado, cortesia presa em pendente para sempre, e
duas sessões de cobrança vivas para a mesma consulta.

O ciclo fecha: a clínica marca com paciente, formato e horário; o paciente vê no
app que espera pagamento; paga; e **o pagamento confirma**, sem um segundo botão.

**Falta medir em produção** depois do deploy, com o commit confirmado na lista de
deployments do Coolify — e, para as telas do app, depois de um build.
