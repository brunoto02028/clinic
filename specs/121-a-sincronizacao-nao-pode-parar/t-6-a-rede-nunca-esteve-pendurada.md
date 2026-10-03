# T-6: A rede nunca esteve pendurada

**Status:** feita (03/10/2026)
**Depende de:** nenhuma

## O que o Bruno perguntou

> *"O app atualiza de acordo com a API do Withings de quanto em quanto tempo?"*

A resposta era **de nenhum em nenhum tempo**, e foi preciso ir ver para a
descobrir.

## O achado

| caminho | corria quando |
|---|---|
| **Webhook** | no instante da medição — **o único automático** |
| **Abrir o app / puxar a tela** | quando a pessoa o faz, mínimo 2 min entre sincronizações |
| **`/api/cron/wearables-sync`** | **nunca** |

A rota existe desde a **075 T-11**, escrita com estas palavras: *"a rede de
segurança por baixo do webhook"*. E nada a chamava:

- `scheduled_tasks` do Coolify: **vazio**;
- `lib/background-jobs.ts`: **nove** jobs — token refresh, posts, campanhas,
  artigos, relatórios de evidência, transcrição ambiente, planos do Atlas,
  outbox, relatórios do paciente — e **nenhum** de wearables.

Então, quando a cadeia de tokens morreu, o webhook parou de conseguir ler e não
havia nada por baixo. **27 dias sem dado**, e a única forma de o trazer era o
paciente puxar a tela.

## O que ficou feito

1. O laço saiu da rota para `lib/wearables-sync-run.ts`
   (`correrSincronizacaoDeWearables`). A rota fica com o segredo e chama-a — um
   laço copiado seria dois laços a divergir.
2. `lib/background-jobs.ts` ganhou o décimo job, de **15 em 15 minutos**, mais
   uma corrida 2 minutos depois do arranque.
3. Uma falha dele não derruba os outros nove.

## Porque quinze minutos

A passagem fala com a Withings por cada ligação, e o plano gratuito vai até
**5.000 chamadas por dia**. A quinze minutos são 96 rodadas diárias, e a própria
passagem já espera 11 segundos entre ligações da mesma conta (o `601` deles).

Em tempo real quem manda é o webhook. Isto é a rede — e uma rede não precisa de
ser rápida, precisa de **estar lá**.

## Critérios, medidos

- [x] O agendador tem o job, e chama a **mesma** função que a rota
- [x] Corre uma vez pouco depois do arranque
- [x] Uma falha dele não derruba os outros nove
- [x] O intervalo é 15 min, e a linha de arranque anuncia-o
- [x] A rota ficou só com o segredo; a lib não devolve resposta HTTP
- [x] 3 mutações mortas: tirar o `setInterval`, tirar o arranque, mudar o intervalo
- [ ] Em produção: ver a linha de arranque com `wearables sync every 15min`
