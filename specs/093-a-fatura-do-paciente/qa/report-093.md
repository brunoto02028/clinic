# QA Report — Atividade 093 (a fatura do paciente)

**Data:** 27/09/2026
**Commit medido:** `e39849623`
**Resultado geral:** ❌ **reprovado** — 35 passaram, 1 reprovou, 7 não executados,
e **3 defeitos**, dois deles graves.

> **Nota de arquivo:** o agente de QA foi impedido pelo harness de escrever este
> `.md`; o texto é o relatório dele, condensado sem perder evidência. As
> screenshots estão em `qa/screenshots/`. O que foi consertado **depois** da
> medição está na última seção.

## O ambiente medido

- Dev server próprio do QA: `npm run dev -- -p 4319`, confirmado como este
  checkout pelo log do próprio processo. A :4000 não foi tocada.
- Um segundo servidor na :4320 **sem as chaves do Stripe**, para os cenários
  1.11 e 4.10. Derrubado depois, e o `tsconfig.json` que o Next alterou sozinho
  foi revertido — `git diff` final vazio.
- Dados: clínica `QA093 Test Clinic` (`cmuk9j65b0000xz7cx91zurh0`) e 5 pacientes
  `qa093.*@example.com`. **Nenhum paciente real tocado.**
- `STRIPE_WEBHOOK_SECRET` vazio e **nenhum endpoint cadastrado** — a T-5 foi
  medida chamando `pagarFaturaComStripe` direto contra o banco, e o ramo do
  webhook por leitura de código.

**PaymentIntents criados** (todos `livemode=false`, nenhum confirmado, nenhum
centavo movido): `pi_3UKOc2…` £50, `pi_3UKOc3…` £30, `pi_3UKOc6…` £45 (do
dependente), `pi_3UKOc7…` £72,50, `pi_3UKOkn…` £30.

## Resumo

| bloco | resultado |
|---|---|
| **T-1/T-2** — o que o paciente vê (1.1–1.11) | ✅ 11/11 |
| **T-3** — o PDF (3.1–3.7) | ❌ 6/7 — **3.1 reprovou** |
| **T-4** — a cobrança (4.1–4.11) | ✅ 11/11 |
| **T-5** — o dinheiro entrou (5.1–5.7) | ✅ 7/7 — e **5.4b**, fora da spec, reprovou |
| **T-6** — a tela (6.1–6.7) | ⚠️ não executados (sem build) — e o **build não saía** |

## O que mais importa

| # | veredito | em uma linha |
|---|---|---|
| **3.3** | ✅ | Token válido meu apontando para a fatura de outro → **404**, sem nome, valor ou número. Não vaza. |
| **3.4** | ✅ | Token de documento na rota da fatura → **401**. O prefixo `invoice:` separa os espaços de nome de verdade. |
| **4.9** | ✅ | Sessão emprestada tentando pagar → **403**, barrada em duas camadas. A porta dos fundos está fechada. |
| **5.2** | ✅ | Reenvio do mesmo intent → `ja_tratado`, **um** lançamento. A receita do dia não infla. |
| **5.3** | ✅⚠️ | Lança **30**, não 50 — a conta está certa. Mas o estado testado o produto não cria; o que ele cria é o 5.4b, e ali o pagamento sumia. |

## Os três defeitos

### 1. ❌ O link do PDF não abria para quem ele foi feito (3.1)

```
$ curl -s "<openUrl da lista>"          # sem cabeçalho, como o app faz
{"error":"Your session has expired. Sign in again.","code":"session_expired"}   HTTP 401

$ curl -s -H "Authorization: Bearer <qualquer>" "<a mesma URL>"
HTTP 200 · content-type: application/pdf · %PDF-1.4
```

O 401 **não era da rota** — era do `middleware.ts`, cuja exceção de `?t=`
listava só `/api/files/`. A rota estava certa e nunca rodava. O paciente que
tocasse "Abrir PDF" veria o JSON de erro ocupando a tela
(`screenshots/t-3-pdf-link-sem-cookie-401.png`).

É o mesmo defeito que o QA de 25/09 achou nos documentos, repetido num caminho
novo.

### 2. ❌ O segundo pagamento da mesma fatura era cobrado e não registrado (5.4b)

```
pagarFaturaComStripe(fatura 50, entra 20, pi_A) → PARTIALLY_PAID, paidAmount=20, 1 lançamento
pagarFaturaComStripe(mesma fatura, entra 30, pi_B) → "ja_tratado"
   fatura: PARTIALLY_PAID, paidAmount=20   ← não mudou
   lançamentos de pi_B: []                  ← nenhum
```

E **o app produz esse estado sozinho**. Na mesma fatura, pela API, logo depois:

```
lista:          {"status":"PARTIALLY_PAID","outstanding":30,"payable":true}
payment-intent: HTTP 200 {"amount":3000, …}
```

Ou seja: a tela mostra "Pagar £30,00", a Stripe cobra o cartão, o webhook chama
a função — e ela não faz nada. A fatura fica eternamente £20 de £50 e os £30 não
entram no financeiro.

Causa: `if (f.financialEntryId) return "ja_tratado"`. A guarda estava presa à
**fatura**, quando o que se repete é o **intent**.

### 3. ❌ `mobile/app.json` derrubava a avaliação da config do Expo

```
$ cd mobile && npx expo config --type prebuild
TypeError: Cannot read properties of undefined (reading 'merchantIdentifier')
    at withStripeIos (…/@stripe/stripe-react-native/lib/commonjs/plugin/withStripe.js)
exit=1
```

O plugin entrou como **string simples**, e ele desestrutura as props sem
default. `mobile/` é projeto managed, então isto passa por `eas build`, `eas
update` e `expo start` — **o build não começava**.

E, corrigido, ainda faltava `enableGooglePay: true`: com o default `false` o
plugin **remove** o metadado do AndroidManifest, e o Google Pay não existiria
nem depois do build.

## Ressalvas

- **⚠️ `returnURL` ausente** no `initPaymentSheet`, com
  `automatic_payment_methods.allow_redirects: "always"`. 3DS2 no Reino Unido é
  regra: sem ele o web view da autenticação pode não voltar ao app. Não
  executável sem build.
- **⚠️ Três `TS7006` novos** em `invoices.tsx` — mesmo padrão dos pré-existentes
  quando o tsconfig do app roda pela raiz.
- **Nota:** o comentário de `allowsDelayedPaymentMethods` dizia que o campo era
  sobre tocar fora da folha. É sobre métodos de confirmação atrasada (SEPA,
  Sofort). O valor estava certo, a justificativa não.
- **Desenho, não defeito:** o link do PDF é uma *capability URL* — quem manda é
  o token, não quem carrega a requisição. É o que `lib/file-access-token.ts`
  documenta, e o motivo de o prazo ser de 5 minutos.

## O que foi consertado depois deste relatório

Mesmo dia:

| defeito | o que mudou |
|---|---|
| **3.1** | `middleware.ts` passa a ter uma **lista** de prefixos de link assinado, com `/api/files/` e `/api/patient/invoices/`. O docstring conta a repetição, para o próximo caminho assinado não esquecer daqui |
| **5.4b** | A guarda passou a ser o **intent**: `FinancialEntry.stripePaymentIntentId` é `@unique`, então o banco recusa o segundo lançamento do mesmo pagamento, e um pagamento **novo** é registrado como deve |
| **3 (app.json)** | Plugin com props: `merchantIdentifier: ""` (não escreve o entitlement da Apple, então o build não depende do Merchant ID) e `enableGooglePay: true`. `npx expo config --type prebuild` volta a rodar, e o entitlement confirmadamente **não** aparece |
| **returnURL** | `bprclinic://invoices` no `initPaymentSheet` |
| **TS7006** | tipos explícitos; `invoices.tsx` zera pelos dois caminhos de tsconfig |
| **comentários** | o de `allowsDelayedPaymentMethods` diz o que o campo faz; o `merchantIdentifier` saiu do `StripeProvider`, que declarava algo que o build não tem |

Cobertos por teste em `__tests__/invoices/a-fatura-do-paciente.test.ts` (29
testes, de 24).

**Limpeza:** os dados de teste continuam no banco **local**, de propósito, para
reproduzir. Para apagar de uma vez:
`DELETE FROM "Clinic" WHERE id = 'cmuk9j65b0000xz7cx91zurh0'` (cascata).
