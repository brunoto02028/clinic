# QA — Atividade 093 (a fatura do paciente)

Escrita em 27/09/2026, junto com a implementação. O que não puder ser executado
é **"não executado"**, nunca "passou".

## O ambiente

- Suba o dev server **numa porta própria deste QA** (`npm run dev -- -p <porta>`)
  e confirme que é este checkout: worktrees paralelos disputam a :4000
  ([[qa-confirmar-qual-checkout-serve-a-porta]]). Não use a :4000.
- O `.env` local tem `STRIPE_SECRET_KEY` e `STRIPE_PUBLISHABLE_KEY` de **teste**,
  da conta `acct_1UKJBC…` (sandbox da BPR). Cobranças criadas aqui são de teste:
  nenhum dinheiro se move.
- `STRIPE_WEBHOOK_SECRET` está **vazio**, e a conta não tem endpoint nenhum
  cadastrado. O webhook não é testável de ponta a ponta sem inventar um segredo
  local — prefira medir `pagarFaturaComStripe` diretamente contra o banco, e
  verificar o ramo do webhook por leitura de código.
- **A tela do app não roda aqui**: depende de módulo nativo novo
  (`@stripe/stripe-react-native`) e de um build que ainda não existe. Todo
  cenário de UI é **não executado**, verificado por código.
- **Nunca logue nem semeie em paciente real.** Crie paciente de teste
  identificado ([[feedback_paciente-real-vs-teste]]).

## T-1/T-2 — O que o paciente vê

| # | passos | esperado |
|---|---|---|
| 1.1 | paciente com faturas `SENT`, `PAID`, `OVERDUE`, `PARTIALLY_PAID` | as quatro aparecem |
| 1.2 | o mesmo paciente com uma `DRAFT` | **não** aparece |
| 1.3 | o mesmo com uma `VOID` | **não** aparece |
| 1.4 | a resposta da lista | **não** traz `pdfBase64` em nenhuma fatura |
| 1.5 | fatura de **outro** paciente | não aparece |
| 1.6 | responsável com dependente que tem fatura | aparece, com `de` = nome da criança |
| 1.7 | a fatura do próprio responsável, na mesma lista | `de: null` |
| 1.8 | sem consentimento aceito | o `patientGate` recusa |
| 1.9 | `outstanding` numa parcial (total 172,80, pago 100,30) | `72.5` — nunca `72.49999999999999` |
| 1.10 | com `STRIPE_SECRET_KEY` no ambiente | `stripePublishableKey` vem preenchida |
| 1.11 | **sem** as chaves | `stripePublishableKey: null` e **toda** fatura com `payable: false` |

## T-3 — O PDF

| # | passos | esperado |
|---|---|---|
| 3.1 | abrir `openUrl` da lista | 200 `application/pdf`, com o número da fatura no nome |
| 3.2 | o mesmo link seis minutos depois | 401 `link_expired` |
| 3.3 | link de **outra** fatura, com token desta | 404 |
| 3.4 | token de **documento** (`/api/files/...`) usado aqui | 401 — o prefixo `invoice:` separa os dois |
| 3.5 | fatura `DRAFT` com link válido gerado antes | 404 |
| 3.6 | fatura antiga sem `pdfBase64` | 404 `no_pdf`, com frase pedindo cópia à clínica |
| 3.7 | sem `?t=` | 401 |

**A que mais importa:** 3.3 e 3.4. Um link que abre a fatura de outra pessoa é
vazamento de dado financeiro com nome e valor.

## T-4 — A cobrança

| # | passos | esperado |
|---|---|---|
| 4.1 | fatura `SENT` de £50 | 200 com `clientSecret`, `amount: 5000` |
| 4.2 | tocar duas vezes seguidas | **o mesmo** PaymentIntent (idempotência), não dois |
| 4.3 | parcial: total 50, pago 20 | `amount: 3000` — o que falta, não o total |
| 4.4 | fatura já `PAID` | 409 `already_paid` |
| 4.5 | fatura `DRAFT` ou `VOID` | 404 |
| 4.6 | resto de 20 pence | 409, com frase mandando falar com a clínica |
| 4.7 | fatura de outro paciente | 404 |
| 4.8 | fatura do **dependente**, da conta do responsável | 200 — ele paga o que é dele pagar |
| 4.9 | a mesma, com **token emprestado** (`onBehalfOf`) | 403 `on_behalf_read_only` |
| 4.10 | sem `STRIPE_SECRET_KEY` | 503 `payments_unavailable` |
| 4.11 | o metadata do PaymentIntent criado | traz `patientInvoiceId`, `patientId`, `clinicId`, `paidByUserId` |

**A que mais importa:** 4.9. Comprar em nome de outro é o que a sessão emprestada
recusa desde a 091 T-7, e esta rota não pode ser a porta dos fundos.

## T-5 — O dinheiro entrou

Medir chamando `pagarFaturaComStripe` direto (o webhook precisa de assinatura, e
não há segredo configurado).

| # | passos | esperado |
|---|---|---|
| 5.1 | fatura `SENT` de £50, pagamento de £50 | vira `PAID`, `paidMethod: "stripe"`, e nasce **um** `FinancialEntry` |
| 5.2 | chamar **de novo** com o mesmo intent | `"ja_tratado"`, e **continua um só** lançamento |
| 5.3 | parcial: fatura 50, já pago 20, entra 30 | `PAID`, `paidAmount: 50`, lançamento de **30** |
| 5.4 | parcial que não fecha: fatura 50, entra 20 | `PARTIALLY_PAID`, `paidAmount: 20` |
| 5.5 | fatura `VOID` | `"ja_tratado"`, nada muda |
| 5.6 | fatura apagada no meio | `"sumiu"`, sem exceção |
| 5.7 | o ramo do webhook, por código | lê `pi.metadata.patientInvoiceId` e usa `amount_received` |

**A que mais importa:** 5.2 e 5.3. Reenvio da Stripe é rotina; contar duas vezes
infla a receita do dia, e lançar o total num parcial infla também.

## T-6 — A tela (não executável aqui)

Verificar por código e registrar como **não executado**:

| # | o quê | esperado |
|---|---|---|
| 6.1 | a tela usa `initPaymentSheet`/`presentPaymentSheet` | e não a folha do navegador |
| 6.2 | `applePay` e `googlePay` configurados | com `merchantCountryCode: "GB"` |
| 6.3 | fechar a folha (`Canceled`) | não vira mensagem de erro |
| 6.4 | depois de pagar | recarrega a lista; **não** escreve `PAID` na tela |
| 6.5 | o PDF | abre com `openFileInApp`, dentro do app |
| 6.6 | a porta | existe no menu do perfil, ao lado de "Meus documentos" |
| 6.7 | sem `stripePublishableKey` | a tela funciona para ver e abrir o PDF |
