# T-9: Webhook da Withings para medidas novas

**Status:** ✅ concluída
**Depende de:** nenhuma. É pré-requisito da T-14.

## Objetivo
A medida chega quando é feita, não quando o cron passa.

## Contexto
Hoje `app/api/wearables/webhook/route.ts` só entende o formato do agregador Open Wearables — que,
confirmado na ativ. 070, **nunca foi configurado em produção**. A Withings tem `notify` próprio:
registra-se uma URL por `appli` (1 = peso, 4 = pressão, 16 = atividade, 44 = sono), ela faz um POST
`x-www-form-urlencoded` e espera `{"status":0}` de volta.

Sem isto, a janela de 3 minutos da T-14 não funciona: a medida só apareceria no próximo sync.

## Passos
1. `POST /api/wearables/withings/webhook` — rota pública, listada em `publicRoutes` no
   `middleware.ts`.
2. Verificação: a Withings não assina o corpo. A proteção é a URL não ser adivinhável **e** o
   `userid` notificado precisar existir como `providerUserId` de uma conexão nossa. Notificação de
   usuário desconhecido é descartada respondendo 200 — responder erro faz a Withings desativar a
   inscrição, e aí o silêncio vira permanente.
3. `notify subscribe` no momento em que o paciente conecta; `revoke` ao desconectar (T-10).
4. Ao receber: buscar só o intervalo notificado (`startdate`/`enddate`) e gravar com deduplicação.
5. Se a conexão for de aparelho da clínica (T-14), chamar a atribuição por janela.
6. Idempotência: a mesma notificação pode chegar duas vezes, e o sync agendado pode trazer a mesma
   medida.

## Arquivos afetados
- `app/api/wearables/withings/webhook/route.ts` (novo)
- `lib/withings.ts` (subscribe / revoke / list)
- `middleware.ts` (rota pública)

## O que ficou de fora (e por quê)

A inscrição real na Withings só acontece quando um paciente conecta em produção: o código chama
`notify subscribe` no callback do OAuth, mas eu não tenho como disparar isso de um `localhost` —
a Withings exige URL pública e HTTPS. O caminho local foi provado com notificação simulada e com
a deduplicação rodando contra o banco de verdade.

Também ficou para a T-10 a revogação do **token**; o que esta tarefa criou (as inscrições) esta
tarefa já cancela no disconnect, senão desconectar não desconectaria nada.

## Critérios de aceite
- [ ] Notificação válida grava a medida em segundos
- [ ] `userid` desconhecido → 200 e nada gravado
- [ ] A mesma notificação duas vezes → uma linha
- [ ] Inscrição criada ao conectar e removida ao desconectar
- [ ] Nenhum dado de outro tenant é tocado
