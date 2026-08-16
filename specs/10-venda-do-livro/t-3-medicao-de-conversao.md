# T-3: Medição de conversão para Ads

**Status:** em andamento — implementada, QA local aprovado, aguardando deploy
**Depende de:** T-2

## Rota escolhida

`/beyond-pain/thank-you`, em inglês para casar com `/beyond-pain/buy`, e com
`robots: noindex` — página de confirmação não tem o que fazer em busca.

## Objetivo

Que o Google Ads e o Instagram saibam **quem comprou**, não quem clicou — é
disso que depende o dinheiro do anúncio ir para as pessoas certas.

## Contexto

Já existe `components/analytics/google-analytics.tsx` com `trackEvent`, usado
para eventos do próprio sistema. Não há pixel da Meta.

O erro comum é disparar a conversão no clique do botão de compra: isso conta
intenção, e a plataforma passa a otimizar para quem clica e não paga. O evento
tem de sair **depois do pagamento confirmado**.

## Passos

1. Página de obrigado (`/beyond-pain/obrigado?pedido=...`) para onde o Stripe
   devolve depois de pagar — é ela que dispara a conversão, e só se o pedido
   estiver mesmo pago.
2. Evento de compra com valor e moeda, para o Ads otimizar por retorno e não
   por volume.
3. Pixel da Meta, se você tiver conta de anúncio — precisa do ID.
4. Confirmação também pelo servidor, no webhook do Stripe: o navegador do
   comprador pode ter bloqueador, e é o webhook que fecha a conta de verdade.
5. Nada de dado pessoal nos eventos — valor, moeda e id do pedido bastam.

## Arquivos afetados

- `app/beyond-pain/obrigado/page.tsx` (novo)
- `components/analytics/google-analytics.tsx`
- webhook do Stripe (a localizar)

## Critérios de aceite

- [x] Conversão dispara só com pagamento confirmado
- [x] Não dispara em visita direta à página de obrigado
- [x] Evento carrega valor e moeda corretos
- [x] Recarregar a página de obrigado não conta duas vezes
- [x] Nenhum dado pessoal sai nos eventos
- [ ] `NEXT_PUBLIC_GA_ID` real no Coolify — hoje é o placeholder
- [ ] Webhook do Stripe — bloqueado pela chave

Relatório: `qa/report-t-3.md`.
