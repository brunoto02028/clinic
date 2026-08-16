# QA — Atividade 10

Em produção (`bpr.clinic`), com pedido de teste e comprador descartável, tudo
removido ao final — mesmo procedimento das atividades 7 a 9.

**Enquanto o Stripe não estiver configurado**, os cenários de pagamento ficam
marcados como **não testados**, explicitamente. Nenhum deles será dado como
aprovado por omissão, e a página não vai para tráfego pago até passarem.

---

## T-1 — O livro como produto

| # | Tipo | Cenário | Resultado esperado |
|---|---|---|---|
| 1.1 | UI | Criar o produto do livro no admin | Salva com preço, frete e capa |
| 1.2 | UI | Alterar o preço no admin | A página de vendas mostra o novo valor, sem deploy |
| 1.3 | API | Checkout de 1 livro | Total = preço + frete + taxa, conferido no centavo |
| 1.4 | API | Checkout de 2 livros | Frete cobrado por unidade, como a regra atual |
| 1.5 | API | Produto digital no mesmo carrinho | Não soma frete |
| 1.6 | API | Pedido criado | Traz nome, e-mail e endereço completos |

## T-2 — Página de vendas

| # | Tipo | Cenário | Resultado esperado |
|---|---|---|---|
| 2.1 | UI | Abrir em 390 px | Tudo legível, botão alcançável, sem rolagem lateral |
| 2.2 | UI | Preço na página x preço no checkout | Idênticos |
| 2.3 | UI | Comprar sem estar logado | Chega ao pagamento sem pedir cadastro |
| 2.4 | UI | Compartilhar o link | Prévia com capa e título corretos |
| 2.5 | UI | Tempo até a página ficar utilizável, 4G simulado | Abaixo de 2,5 s |
| 2.6 | UI | Capítulo grátis | Presente uma vez, sem competir com a compra |
| 2.7 | UI | Endereço incompleto | Erro claro, no campo, sem perder o que foi digitado |

## T-3 — Medição de conversão

| # | Tipo | Cenário | Resultado esperado |
|---|---|---|---|
| 3.1 | UI | Abrir a página de obrigado direto, sem comprar | **Nenhuma** conversão disparada |
| 3.2 | UI | Chegar nela após pagamento confirmado | Conversão com valor e moeda |
| 3.3 | UI | Recarregar a página de obrigado | Não conta de novo |
| 3.4 | API | Webhook do Stripe | Registra a compra mesmo com o navegador bloqueando |
| 3.5 | UI | Payload do evento | Sem nome, e-mail ou endereço |

## T-4 — Aviso de despacho

| # | Tipo | Cenário | Resultado esperado |
|---|---|---|---|
| 4.1 | UI | Marcar pedido como enviado, com rastreio | Cliente recebe e-mail com número e link |
| 4.2 | UI | Trocar a transportadora | O link muda junto |
| 4.3 | UI | Marcar como enviado sem rastreio | Permitido; e-mail sai sem link |
| 4.4 | API | E-mail falhando | Despacho é gravado; falha aparece registrada |
| 4.5 | UI | Confirmação de compra | Chega logo após o pedido |

---

## Encerramento

- [ ] Pedido e comprador de teste removidos, com contagem confirmando
- [ ] Nenhum pedido real alterado
- [ ] Cenários de pagamento aprovados **ou** listados como não testados
- [ ] Produção saudável e no build esperado
