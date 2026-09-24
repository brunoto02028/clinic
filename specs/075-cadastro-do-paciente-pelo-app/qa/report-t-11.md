# QA — T-11: a rede de segurança, e alguém que perceba o silêncio

**Data:** 24/09/2026 · **Ambiente:** worktree `app_clinic`, dev em `:4014`
**Dados:** prefixo `qa-t11-`, removidos ao final
**Resultado:** ✅ **aprovado**, com o mesmo limite da T-10: a conversa real com a Withings depende
de uma conta e de um aparelho

## Duas afirmações do código que não eram verdade

- `app/api/wearables/callback/route.ts` dizia que *"os dados ainda chegam no sync agendado"* para
  justificar que uma assinatura recusada era sobrevivível. **Não havia sync agendado**: nenhum cron
  em `app/api/cron/` tocava wearable, e o único sync era o botão que o paciente aperta.
- `lib/clinic-device.ts` deduplicava por `grpid` citando a leitura que chega *"uma vez pelo webhook,
  outra pelo sync agendado"* — uma proteção para um segundo caminho que nunca rodava.

Webhook era o caminho único. Uma medida tirada durante um deploy era uma medida perdida.

## O que passou a existir

`POST /api/cron/wearables-sync?key=…`, no mesmo padrão dos outros crons. Para cada conexão
Withings conectada: puxa desde a última leitura (com 3 dias de folga, porque a lacuna é exatamente
o que se quer reparar, e teto de 30 dias), ingere pelo **mesmo caminho** do webhook — a
deduplicação por `grpid` agora tem função — e, de quebra, confere a assinatura de quem nunca foi
perguntado, sem esperar alguém abrir uma tela.

E um campo novo, `lastReadingAt`, **em vez de** redefinir `lastSyncedAt`. Os dois querem dizer
coisas diferentes: "falamos com o provedor" e "chegou dado". Redefinir o primeiro em silêncio faria
um aparelho mudo desde janeiro parecer sincronizado hoje, que é o oposto do objetivo.

O limiar de silêncio é uma `AutomationRule` (`WEARABLE_SILENCE`, padrão 5 dias), editável em
`/admin/automation` sem deploy — quem mede uma vez por semana não é quem mede todo dia.

## A prova

```
== Autenticacao do cron ==
  sem key:     401        key errada:  401

== Rodando de verdade (token falso: a Withings recusa) ==
  200 {"connections":1,"synced":0,"withData":0,"failed":1,"subscriptionsChecked":0,...}

== O que importa: falha NAO pode carimbar "chegou dado" ==
  lastReadingAt mudou? nao (correto)
  ainda conta como silencioso? 10 dias
```

A última linha é a que sustenta tudo: se uma sincronização que falhou carimbasse a data, todo
aparelho quebrado passaria a parecer saudável logo depois do cron — o defeito se apagaria sozinho.

**12 testes novos** em `__tests__/wearables/silence.test.ts`, incluindo os que um engano tornaria
invisível: aparelho **desconectado** não conta como silencioso (quem desconectou sabe disso), o
limiar conta **no dia exato**, "nunca chegou nada" mede desde a criação (conectado há um mês e mudo
é justamente o caso a mostrar), e uma regra que explode devolve o padrão em vez de deixar a tela
sem resposta. Suíte: **422 passando**.

## Onde o silêncio aparece

- `/admin/biohacking`: a linha do paciente fica âmbar e diz `silent Nd`.
- Caixa de entrada de medições: o aparelho **da clínica** — o que alimenta vários pacientes e era o
  único sem nenhuma tela sobre isso, porque `/admin/biohacking` só varre quem tem papel de paciente
  e aquela conexão pertence a quem autorizou.

## Segunda rodada — o code review

Um **crítico** e cinco **altos**. Todos corrigidos.

**CRÍTICO — o cron queimava o próprio token.** A Withings rotaciona o refresh token a cada
refresh e grava o novo no banco; o objeto em memória fica velho na hora. O cron chamava
`subscribeAndRecord` (que refresca) e logo em seguida `ingestWithings` com o **mesmo objeto**, ou
seja, tentando refrescar com um token que eles acabaram de invalidar. Quem caía nisso eram
exatamente as conexões antigas que este cron existe para resgatar, em toda rodada em que o token
estivesse vencendo — e o token deles dura ~3h. Agora a conexão é relida entre as duas chamadas.

**ALTO — o carimbo estava em três lugares e errava em dois.**

| O que era | O que é |
|---|---|
| `arrived` somava `activity.length` e `sleep.length`, que são **linhas devolvidas na janela**, não linhas novas. Como a janela olha 3 dias para trás, um aparelho que parou ontem seria carimbado por mais 3–4 rodadas e o silêncio só apareceria com ~9 dias | o carimbo usa a **data da leitura mais nova**, não `agora`. A data da medida não mente |
| leitura do aparelho da clínica que cai na caixa de não atribuídas não contava como dado — a mesma tela listava as leituras e dizia "nada chega há N dias" | conta: é dado chegando do mesmo jeito |
| o sync manual do paciente não carimbava nada: ele recebia o dado e continuava marcado como mudo | o carimbo mora dentro de `ingestWithings`, então os três chamadores usam o mesmo caminho |

**ALTO — sem backfill, todo aparelho nasceria mudo.** A coluna nova nasce vazia e `daysSilent`
cai na data de criação: no primeiro boot, **todos** apareceriam mudos há meses, inclusive os que
reportam todo dia. Um alarme que grita em cima de quem está bem ensina a ignorar. Script de boot
preenche a partir do que já está no banco — pontos de wearable, pressão e a caixa de não
atribuídas. Local: **1 conexão preenchida**.

**ALTO — nada agendava o cron.** Era trocar "comentário que promete um sync" por "rota que ninguém
chama". Cadastrado no Coolify: `wearables-sync`, `0 */6 * * *`, ligado.

**Médios, também corrigidos:** o interruptor `active` da regra era ignorado (o admin desligava e os
avisos continuavam); `status: "ERROR"` — o único estado que já significa "quebrado" — era tratado
como "não está mudo" e sumia de todas as telas e do próprio cron; o loop não tinha ordem nem teto
contra os 300s do Coolify (agora vai do mais antigo para o mais novo, com orçamento de 240s, então
a rodada seguinte continua de onde parou); leitura sem `grpid` no aparelho da clínica viraria uma
linha nova na caixa **por dia**, porque o cron relê a mesma janela (agora deduplica por horário e
valores); e a contagem no admin mostrava um aparelho quando havia dois.

**Testes:** 429 passando, com dois novos que prendem o que o review achou — `ERROR` conta como
silêncio, e regra desligada não marca ninguém. Mais a asserção que faltava: `loadRule` é chamada
com o código certo, porque a string literal dos dois lados erraria em silêncio e o sistema usaria o
padrão para sempre.

**Deixado como está, e declarado:** a metade `CREATE_ALERT` da regra não cria alerta — só o
`condition` é lido, exatamente como em `BP_THRESHOLDS`. O silêncio aparece em duas telas que
alguém precisa abrir. Ligar isso ao motor de alertas é decisão do Bruno, porque passa a gerar
linha de alerta todo dia.

## O que este QA não prova

A busca real na Withings. O cron foi exercido com token inválido, que prova o caminho de erro e o
isolamento (um paciente com token expirado não interrompe os outros). O caminho feliz — medida
tirada com o servidor fora do ar, aparecendo depois do cron — precisa do BPM Connect, e é o segundo
item a conferir no primeiro teste real, junto com o estado da assinatura.
