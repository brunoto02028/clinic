# T-1: Medir antes de consertar

**Status:** pendente

## Objetivo

Saber **onde** o dado para, antes de mexer em qualquer linha.

## Contexto

O quadro — conexão "ok", *last sync* de hoje, tela vazia — cabe em pelo menos
quatro causas diferentes:

1. a assinatura do webhook caiu e a Withings parou de avisar;
2. o webhook chega e a gravação falha;
3. grava, e a tela lê de outro lugar;
4. o token expirou e o `sync` falha em silêncio, mas a data de sincronia é
   escrita mesmo assim — o que explicaria o "hoje" sem dado nenhum.

A quarta é a mais traiçoeira, porque a tela **mente com cara de verdade**: diz
que sincronizou hoje.

Esta tarefa existe por causa do que acabou de acontecer com o `version.json`:
três tentativas de conserto, todas palpites, porque ninguém tinha medido. A
primeira coisa é medir.

## Passos

1. Ler no banco: a conexão, o token, a validade, a data de sincronia, e **quantos
   pontos de dado existem por tipo e por data**.
2. Conferir se a última leitura de pressão *"from your device"* de 24/09 tem
   irmãs de outros tipos na mesma data — se sim, tudo parou junto, e é uma causa
   só.
3. Ver o que a Withings diz das assinaturas dessa conta.
4. Ler o log do servidor atrás de webhook recebido, e de webhook recusado.

## Arquivos afetados

Nenhum. Esta tarefa não muda código.

## Critérios de aceite

- [ ] Existe uma tabela: tipo de dado × último recebido × por qual caminho
- [ ] Está escrito se o token está válido, e se o `sync` realmente sincroniza
- [ ] A causa está **nomeada**, e não suposta
- [ ] As duas perguntas do `plan.md` — a pressão e o resto — têm resposta separada
