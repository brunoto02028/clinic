# Atividade 093 — A fatura do paciente

**Aberta em:** 27/09/2026
**Pedido do Bruno:** *"faz a tela de invoice no app tb"* e, em seguida,
*"lembrando que temos o app no android e iOS, deixa nativo para os dois os
pagamentos ok?"*

## O problema

A clínica emite a fatura, numera (`BPR-2026-000001`), gera o PDF **com o logo da
BPR** e o endereço da empresa, e manda por e-mail depois que alguém aprova na
fila (atividade 039 — nada financeiro sai sozinho).

E o paciente **não tinha onde ver**. Nem no app, nem na web: `/dashboard/billing`
é a cobrança do aluno do personal, outra frente. Quem apagasse o e-mail ficava
sem a fatura.

Como o app é o único lugar do paciente depois do lançamento
([[paridade-web-app-paciente]]), "só por e-mail" é o mesmo que "não tem".

## Decisões

**O PaymentSheet, e não a folha do Checkout.** A consulta é paga abrindo a
página do Stripe numa folha de navegador dentro do app — funciona, e ainda é uma
página web dentro de um app. O PaymentSheet é a folha que o **sistema** desenha:
teclado de cartão nativo, Apple Pay no iPhone, Google Pay no Android. Foi o que
o Bruno pediu quando disse "nativo para os dois".

**O custo disso é um build.** `@stripe/stripe-react-native` é módulo nativo: o
fingerprint muda, nenhum `eas update` alcança o binário instalado, e a tela só
chega ao telefone no próximo build. Build só com autorização
([[feedback_build-so-com-autorizacao]]).

**Apple Pay fica para depois do merchant id.** Ligar exige um Merchant ID no
portal da Apple e o certificado de processamento do Stripe — e capability nova
invalida o provisioning ([[bug-capability-nova-invalida-provisioning]]), que é
menu interativo e precisa do Bruno. Sem ele, o PaymentSheet paga por cartão
normalmente e o botão do Apple Pay simplesmente não aparece.

**Rascunho nunca aparece.** `DRAFT` está na fila de aprovação; mostrá-lo seria a
fatura chegando ao paciente sem o passo que existe para que nada saia sozinho.
`VOID` também não: fatura cancelada não se paga.

**Sem gate de módulo.** Fatura não é assunto clínico — não pode sumir porque a
clínica desligou "documentos". O `patientGate` continua valendo para sessão e
consentimento.

**Quem cuida vê e paga da própria conta.** A fatura de uma criança sai no nome
dela, e a criança não faz login. Ela aparece na lista do responsável, **com o
nome de quem é**, e é paga da conta dele. **Não** pela sessão emprestada: ali
quem age é a criança, e gastar dinheiro no lugar de outro continua recusado — o
que evita acrescentar entrada na lista de escritas permitidas de
`lib/sessao-emprestada.ts`.

**Quem marca como paga é o webhook.** Marcar ao abrir a folha daria por paga a
fatura de quem fechou o app no meio. Mesma regra da consulta.

## Tarefas

| T-N | nome | depende de | status |
|---|---|---|---|
| T-1 | Regras: o que o paciente vê, quanto falta, quem pode pagar (`lib/patient-invoices.ts`) | — | **feita** (27/09) |
| T-2 | `GET /api/patient/invoices` — lista, com link assinado do PDF | T-1 | **feita** (27/09) |
| T-3 | `GET /api/patient/invoices/[id]/pdf` — o PDF pela capability URL | T-2 | **feita** (27/09) |
| T-4 | `POST /api/patient/invoices/[id]/payment-intent` — a cobrança nativa | T-1 | **feita** (27/09) |
| T-5 | Webhook `payment_intent.succeeded` marca paga + lança no financeiro | T-4 | **feita** (27/09) |
| T-6 | A tela no app: lista, PDF, PaymentSheet, porta no perfil | T-2..T-4 | **feita** (27/09), QA reprovou e os 3 defeitos foram corrigidos — **não chega ao telefone sem build** |
| T-7 | Apple Pay: merchant id no portal + no plugin | T-6 | **pendente** — precisa do Bruno |

## Suposições

- **Moeda** vem da própria fatura (`currency`), com libra como padrão do formato.
- **Mínimo de 30 pence** é limite da Stripe: abaixo disso não há botão, e o certo
  é a clínica perdoar o troco.
- **Pagamento parcial** soma ao que já havia; o lançamento no financeiro é só o
  que entrou agora, senão a receita do dia infla.
- **Sem chave Stripe** nenhuma fatura volta pagável — é o estado de produção
  hoje, e o botão não aparece em vez de aparecer e morrer em 503.

## O que falta para o paciente pagar de verdade

1. **Chave live da BPR** (`STRIPE_SECRET_KEY` + `STRIPE_PUBLISHABLE_KEY`) no
   Coolify. A de teste **não** pode ir para produção.
2. **`STRIPE_WEBHOOK_SECRET`** e o endpoint cadastrado — a conta tem zero hoje.
   Sem ele o dinheiro entra e a fatura fica em aberto para sempre.
3. **Build novo** do app, autorizado pelo Bruno.

## O que o QA achou, e o que mudou (27/09)

Reprovou, com razão. Três defeitos, dois graves:

1. **O link do PDF não abria** — o `middleware.ts` só deixava passar `?t=` em
   `/api/files/`, então a rota da fatura nunca rodava e o paciente via um JSON de
   erro ao tocar em "Abrir PDF".
2. **O segundo pagamento da mesma fatura era cobrado e não registrado** — a
   guarda de idempotência estava presa à fatura em vez do intent. O app produz
   esse estado sozinho: pagar metade, e depois o resto.
3. **`mobile/app.json` derrubava `expo config`** — o plugin do Stripe entrou como
   string simples e exige props. Sem isso não há build **nem** update, para o app
   inteiro.

Os três estão corrigidos, com teste. Detalhe e evidência em
[qa/report-093.md](qa/report-093.md).

**Uma lição que vale além desta atividade:** o defeito 1 é o mesmo que o QA de
25/09 achou nos documentos, num caminho novo. A exceção do middleware virou uma
lista justamente para que o próximo link assinado não repita.
