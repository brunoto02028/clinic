# T-11: A rede de segurança, e alguém que perceba o silêncio

**Status:** concluído · **Depende de:** T-10

## Objetivo
Que um dado não se perca porque uma notificação se perdeu — e que ninguém descubra isso meses
depois.

## Contexto
Duas afirmações do código que não são verdade hoje:

- `app/api/wearables/callback/route.ts:99` diz *"the data still arrives on the scheduled sync"*.
  **Não existe sync agendado.** Nenhum cron em `app/api/cron/` toca wearables; o único sync é
  `POST /api/wearables/sync`, disparado pelo paciente apertando um botão.
- `lib/clinic-device.ts:81` fala da leitura que chega *"uma vez pelo webhook, outra pelo sync
  agendado"* — a deduplicação por `grpid` existe para um segundo caminho que nunca roda.

Ou seja: **webhook é o único caminho**. Se a Withings entregar e nosso servidor estiver
reiniciando no meio de um deploy, a medida some. E `lastSyncedAt` está na tabela sem ninguém
olhando — um aparelho pode parar de mandar em janeiro e a clínica descobrir em março.

## Passos
1. Cron diário: para cada conexão `CONNECTED`, puxar `getmeas` desde `lastSyncedAt` (com folga) e
   ingerir pelo mesmo caminho do webhook — a deduplicação por `grpid` já existe e passa a ter
   função.
2. Atualizar `lastSyncedAt` **quando algo chega**, não quando a chamada acontece: "sincronizou e
   não veio nada" e "não sincronizou" são coisas diferentes.
3. Silêncio vira coisa visível: aparelho conectado sem nenhuma leitura há N dias aparece no
   prontuário e numa lista no admin. N configurável, porque um paciente que mede 1x por semana
   não é o mesmo que um que mede todo dia.
4. Corrigir os dois comentários para dizerem o que o código faz.

## Arquivos afetados
- `app/api/cron/wearables-sync/route.ts` (novo), `lib/withings-ingest.ts`, `start.sh` (agenda),
  prontuário do admin, `lib/clinic-device.ts` e `app/api/wearables/callback/route.ts` (comentários)

## Critérios de aceite
- [ ] Medida tirada com o servidor fora do ar aparece depois do cron — **falta o
      teste real com o BPM Connect**
- [x] Rodar o cron duas vezes não duplica nada — dedup por `grpid`, e por
      horário+valores quando a Withings não manda id (code review da T-11)
- [x] ~~`lastSyncedAt` reflete chegada de dado~~ — **mudado de propósito**:
      `lastSyncedAt` continua querendo dizer "falamos com o provedor", que é o
      que a tela mostra como "Last sync". Quem mede chegada é `lastReadingAt`,
      campo novo, carimbado com a **data da leitura** e não com `agora`
- [x] Aparelho em silêncio aparece para a clínica sem ninguém ir procurar —
      âmbar em `/admin/biohacking` e na caixa de medições. **Parcial**: são duas
      telas que alguém precisa abrir; alerta no motor fica para decisão do Bruno
- [x] Os dois comentários passam a ser verdade
