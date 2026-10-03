# E-mail para a LML — o acesso à API

**Escrito em** 03/10/2026, para o Bruno rever e enviar. **Não foi enviado.**

Para: `info@londonmedicallaboratory.co.uk` (e o Ramon em cópia/direto)
Telefone, se for mais rápido: +44 (0)20 7183 3718

---

## Versão em português

**Assunto:** BPR Clinic — acesso à API (sandbox e produção)

Olá Ramon, tudo bem?

Sou o Bruno, da **BPR Clinic**. Estamos a integrar os exames da London Medical
Laboratory dentro da nossa aplicação: o paciente escolhe o exame no app, e o
resultado entra no prontuário dele, onde o terapeuta o acompanha.

**Já temos conta aberta** (e-mail: `[preencher]`). O que falta é o acesso à API,
e aproveito para alinhar mais dois pontos técnicos.

**1. Credenciais de API**

Podem emitir as chaves para a nossa conta? Precisamos de **duas**: uma de
*sandbox*, para testarmos sem tocar em pedidos reais, e a de produção.

**2. A API cobre as marcações e a colheita?**

Li o *Client Portal User Guide*. O portal faz à mão um fluxo que nos interessa:
criar o paciente, marcar a colheita, escolher o exame pelo código, imprimir o
formulário e acompanhar o estado até o laboratório receber a amostra.

A API cobre esse mesmo fluxo — marcar, remarcar, cancelar e consultar os pontos
de colheita — ou isso só existe pelo portal?

**3. O e-mail de resultado ao paciente**

O guia diz que o resultado vai por e-mail para o paciente. No nosso desenho, o
resultado entra primeiro no prontuário e é o terapeuta que o partilha com ele,
com acompanhamento. Os dois ao mesmo tempo fariam o paciente receber o resultado
antes de alguém o ter visto.

**Existe forma de desligar esse envio automático**, ou de o dirigir só à clínica?

**4. Conta faturada em vez de pré-pago**

Vi no portal que, para clientes *pre-pay*, o cartão é cobrado ao *List Price* no
momento em que o pedido é criado. A redação sugere que existem clientes que
**não** são pré-pagos.

**Podemos ficar numa conta faturada** (mensal, por exemplo)? O paciente paga-nos
pelo Stripe, e o dinheiro só nos chega dias depois; a cobrança imediata do custo
obriga-nos a adiantar capital em cada pedido.

**5. Cancelamentos**

Se um pedido for cancelado **antes de o kit ser despachado** ou antes da
colheita, ele é-nos cobrado na mesma? Precisamos de saber para decidir até
quando podemos devolver o dinheiro ao paciente.

Fico a aguardar. Se for mais rápido por telefone, diga-me e eu ligo.

Obrigado,
Bruno
BPR Clinic

---

## Versão em inglês

*(para o Ramon reencaminhar internamente — quem responde ao ponto 2 e 3 é
provavelmente a equipa técnica)*

**Subject:** BPR Clinic — API access (sandbox and production)

Hi Ramon,

I'm Bruno, from **BPR Clinic**. We're integrating London Medical Laboratory
tests into our own application: the patient chooses a test in the app, and the
result lands in their clinical record, where their therapist follows it up.

**We already have an account** (registered under `[fill in]`). What we're missing
is API access, and I'd like to settle two more technical points at the same time.

**1. API credentials**

Could you issue the keys for our account? We need **two**: a sandbox key, so we
can test without touching real orders, and the production one.

**2. Does the API cover appointments and collection?**

I've read the Client Portal User Guide. The portal covers, by hand, a flow we
need: create the patient, book the collection, select the test by code, print the
request form, and follow the status until the lab receives the sample.

Does the API cover that same flow — booking, rebooking, cancelling, and listing
collection points — or is it portal-only?

**3. The result email to the patient**

The guide says results are emailed to the patient. In our design the result
reaches the clinical record first, and the therapist shares it with the patient
alongside the follow-up. Both at once would mean the patient reading a result
before anyone has looked at it.

**Is there a way to switch that automatic email off**, or to send it to the
clinic only?

**4. An invoiced account rather than pre-pay**

I can see in the portal that, for *pre-pay* customers, the card is charged the
List Price at the moment a test request is created. The wording suggests some
customers are **not** pre-pay.

**Could we be put on an invoiced account** (monthly, say)? Patients pay us
through Stripe and the funds only reach us days later, so an immediate charge
means fronting the cost on every order.

**5. Cancellations**

If an order is cancelled **before the kit is dispatched**, or before collection,
are we still charged? We need to know in order to decide how late we can refund
the patient.

Thank you,
Bruno
BPR Clinic

---

## Por que estas três perguntas, e não outras

- **As credenciais** são o único bloqueio real: T-5 a T-9 da atividade 081 estão
  todas à espera delas. O resto já está escrito e testado. *(A conta já existe —
  corrigido em 03/10, era o que eu tinha anotado como pendente.)*
- **O sandbox** é o que permite QA sem gastar dinheiro nem criar pedidos a
  sério — e o mapa da API de 26/09 confirma que ele existe
  (`api.sandbox.londonmedicallaboratory.com`).
- **O e-mail ao paciente** é a única das três que mexe no produto: se não der
  para desligar, o desenho da liberação pelo terapeuta (081 T-4) tem de mudar, e
  é melhor saber antes de o construir do que depois.

- **Como cobram** deixou de ser pergunta: o portal diz, em
  `/payment`, que o cartão é cobrado ao *List Price* quando o pedido é criado.
  A pergunta passou a ser **se dá para ficar em conta faturada** — porque o
  Stripe liberta o dinheiro do paciente só dias depois, e o pré-pago obriga a
  adiantar o custo de cada exame.

  *(Enquanto não houver resposta: cartão de **crédito** no portal em vez de
  débito resolve sozinho — a fatura vence depois de o Stripe já ter pago.)*

- **Cancelamentos** é a outra metade do mesmo: se o pedido já foi criado, o
  custo já saiu.

Ficou **de fora** de propósito, para não misturar comercial com acesso técnico:
três preços que o portal mostra e que não fecham —

| SKU | custo | RRP | o quê |
|---|---|---|---|
| `9S` | £518,80 | **£1,00** | a série `1S`–`8S` vai de £214 a £983; o `9S` quebra. Vender ao RRP perde £517,80 |
| `LEM` | £132,44 | £129,00 | margem **negativa**, já vista no PDF de 2024 e agora confirmada ao vivo |
| `GFR` | **vazio** | £49,00 | sem preço de custo nenhum |

Valem um e-mail só deles, depois.
