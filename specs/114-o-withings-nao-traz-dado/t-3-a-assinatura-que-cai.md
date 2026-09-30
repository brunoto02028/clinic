# T-3: A assinatura que cai em silêncio

**Status:** pendente
**Depende de:** T-1

## Objetivo

Que o dado volte a chegar sozinho, e que a queda deixe de ser silenciosa.

## Contexto

A Withings desativa a assinatura quando o webhook não responde status 0 — e não
avisa ninguém. Existe `resubscribe` na integração, então alguém já previu isto; o
que falta saber é se ele roda, e se cobre todos os tipos.

**A assinatura é por tipo (`appli`):** assinar pressão não traz sono. Se só a
pressão estivesse assinada, o quadro se explicaria inteiro — pressão chegou até
24/09 e sono nunca apareceu.

## Passos

1. Listar os tipos que a clínica precisa, e os que estão assinados hoje.
2. Garantir que o webhook responde status 0 **sempre**, inclusive quando a
   gravação falha. Recusar o aviso é o que derruba a assinatura — e aí um erro de
   gravação de um dia vira silêncio de um mês.
3. Reassinar o que estiver caído, e uma verificação periódica que **avise** em
   vez de consertar calado: uma assinatura que cai toda semana é um defeito, e
   reassinar em silêncio o esconderia.
4. Respeitar o limite de 5.000 chamadas do plano gratuito.

## Arquivos afetados

- `app/api/wearables/webhook`
- `app/api/wearables/resubscribe`
- `app/api/wearables/sync`

## Critérios de aceite

- [ ] Os tipos necessários estão assinados
- [ ] O webhook responde 0 mesmo quando a gravação falha
- [ ] Assinatura caída vira aviso para a clínica, e não conserto mudo
- [ ] Dado novo no aparelho aparece no app sem ninguém apertar nada
- [ ] A contagem de chamadas num dia cheio fica longe do limite
