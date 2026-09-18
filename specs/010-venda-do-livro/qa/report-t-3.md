# QA — T-3: Medição de conversão

**Data:** 15/08/2026
**Ambiente:** local (`next dev` na porta 4100) apontando para o **banco de produção**
**Motivo de não ser em produção:** o código da T-3 ainda não está deployado.
Os cenários de pagamento continuam **não testados** — o Stripe segue sem chave.

## Como foi medido

O evento de conversão é JavaScript no navegador, então `curl` não serve. Rodei
o Chrome via Playwright instalando **antes do carregamento da página** dois
substitutos que gravam toda chamada de `gtag` e `fbq`, mais o consentimento de
cookies em `localStorage`. Assim se vê exatamente o que sairia para o Google e
para a Meta, sem depender de nenhuma conta configurada.

Scripts: `qa-t3.js` e `qa-t3b.js` (scratchpad da sessão).

## Resultados

| # | Cenário | Esperado | Resultado |
|---|---|---|---|
| 3.1 | Abrir a página de obrigado direto, sem comprar | Nenhuma conversão | **0 conversões** ✅ |
| 3.1b | Pedido inexistente na URL | Nenhuma conversão | **0 conversões** ✅ |
| 3.1c | Pedido existente mas **não pago** | Nenhuma conversão | **0 conversões** ✅ |
| 3.2 | Pedido pago | Conversão com valor e moeda | **GA4 + Meta** ✅ |
| 3.3 | Recarregar a página de obrigado | Não conta de novo | **0 conversões** ✅ |
| 3.5 | Payload sem dado pessoal | Sem nome/e-mail/endereço | **nenhum vazamento** ✅ |
| 3.4 | Webhook do Stripe | Registra mesmo com bloqueador | **não testado** — sem chave |

Eventos capturados no cenário 3.2:

```
GA4 : ["event","purchase",{"transaction_id":"BPR-QA-T3-PAGO","value":19.99,"currency":"GBP"}]
Meta: ["track","Purchase",{"value":19.99,"currency":"GBP"},{"eventID":"BPR-QA-T3-PAGO"}]
```

Testei também o consentimento granular, que a spec não previa:

| Consentimento do visitante | Resultado |
|---|---|
| Recusou tudo | nenhuma conversão |
| Só analytics | só GA4 |
| Só marketing | só Meta |

Busquei explicitamente por `qa-t3@example.com`, `QA T3`, `Fore Street`,
`Ipswich` e `IP4 1JW` no payload completo: nenhum aparece.

## Bloqueio encontrado

**O Google Analytics de produção está apontando para o placeholder.**
Visitando `https://bpr.clinic/` com consentimento aceito, o navegador dispara:

```
https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX
https://region1.google-analytics.com/g/collect?v=2&tid=G-XXXXXXXXXX…
```

`NEXT_PUBLIC_GA_ID` não está definido no Coolify, então o código cai no valor
padrão `'G-XXXXXXXXXX'` de `components/analytics/google-analytics.tsx:8`. Toda
visita e toda conversão estão sendo enviadas para uma propriedade que não
existe. Sem corrigir isso, o Bruno rodaria tráfego pago e veria zero conversão.

O mesmo vale para o pixel da Meta: `NEXT_PUBLIC_META_PIXEL_ID` ainda não existe.
Diferente do GA, o pixel foi escrito para **não carregar nada** sem o ID — não
há placeholder para vazar.

## Observação menor

O `page_path` que o GA registra inclui o id do pedido
(`/beyond-pain/thank-you?order=cmsu…`). Não é dado pessoal — é um cuid opaco, e
a página só expõe número do pedido, total e status. Fica registrado por ser
identificador de pedido indo para terceiro.

## Pendências para aprovar

- [ ] `NEXT_PUBLIC_GA_ID` definido no Coolify
- [ ] `NEXT_PUBLIC_META_PIXEL_ID`, quando houver conta de anúncio
- [ ] Cenário 3.4 (webhook) quando o Stripe estiver configurado
- [ ] Reexecutar em produção após o deploy

## Limpeza

Dois pedidos de teste criados (`BPR-QA-T3-PAGO`, `BPR-QA-T3-PEND`) e removidos
ao final. Contagem confirmada: **0 pedidos**, **1 produto** (Beyond Pain,
inativo). Nenhum pedido real existia ou foi alterado.

## Evidências

- `screenshots/t-3-obrigado-pedido-pago.png`
