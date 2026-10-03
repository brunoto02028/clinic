# T-1: O refresh é um de cada vez

**Status:** feita (03/10/2026)
**Depende de:** nenhuma

## Objetivo

Que dois processos nunca gastem o mesmo refresh token — porque gastá-lo duas
vezes mata a ligação **para sempre**.

## Contexto

A Withings troca o refresh token a cada uso. `withingsAccessToken` recebia um
retrato da ligação, renovava e gravava o novo par, **sem trava**. Quatro
caminhos o chamam: o cron, o webhook, o puxar-a-tela e a sondagem.

O cron já reler os tokens entre a assinatura e a ingestão fechava a corrida
*dentro* dele. As outras ficaram abertas — e é o caso mais comum: uma medição
chega pelo webhook enquanto o cron corre.

Resultado medido em produção: `Invalid Params: invalid refresh_token`, a cadeia
invalidada, e **27 dias sem leitura** na Activity do Bruno.

## O que ficou feito

1. `WearableConnection.refreshLockedAt` — a trava vive no banco porque o produto
   corre em mais de um contentor; um `Set` em memória não vê o outro.
2. `withingsAccessToken` **relê a ligação** antes de decidir: outro processo pode
   ter renovado há dois segundos, e aí já há token bom.
3. A trava toma-se com um `updateMany` condicional — a condição e a escrita na
   mesma operação, que é o que a torna atómica. `count` é a resposta.
4. **Quem não ganha a trava espera 600 ms e relê**, até três voltas. Não falha:
   o vencedor vai gravar um token bom, e usá-lo é o certo. Pedir outro seria
   queimar o refresh dele.
5. A trava expira em **30 s**, para um processo que morra a meio não trancar a
   ligação para sempre.

## Critérios, medidos

- [x] Dois pedidos em paralelo fazem **um** refresh, e os dois recebem o mesmo token
- [x] Quatro em paralelo idem — é o cron, o webhook, a tela e a sondagem
- [x] Um token que ainda serve não renova nada
- [x] Uma trava velha não tranca: o pedido seguinte passa
- [x] A trava é libertada **mesmo quando o refresh falha**
- [x] 3 mutações mortas: tirar a trava, tirar a releitura, tirar a marcação
- [ ] Confirmar `in sync` no log do contentor depois do deploy
