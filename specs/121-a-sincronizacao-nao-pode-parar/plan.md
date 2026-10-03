# 121 — A sincronização não pode parar

**Estado:** T-1 a T-4 e T-6 feitas e **em produção**; a T-6 nasceu de uma pergunta do Bruno e é a raiz de tudo. Falta reconectar e uma semana de medição (T-5)
**Aberta em:** 03/10/2026
**Pedido do Bruno:** *"Nao pode parar de sincronizar jamais"* — com três telas: a
aba Saúde a mostrar o sono de ontem como se fosse normal, e a Activity a dizer
**"27 days without a reading"**.

## O que aconteceu

A ligação Withings do Bruno está morta desde ~05/09. O log do contentor diz:

```
[withings/webhook] error: Withings status 503: Invalid Params: invalid refresh_token
```

E o app **não mostra pendência nenhuma**: as telas dele são as de um paciente
que simplesmente não mediu nada. É a ausência silenciosa outra vez, agora na
coisa que o produto inteiro depende de ter.

## A causa, em três partes

**1. O refresh não tem trava entre processos.** A Withings **troca o refresh
token a cada uso** — é de uso único. `withingsAccessToken` recebe um retrato da
ligação, chama o refresh e grava o novo par. Quatro caminhos o chamam:

| caminho | quando |
|---|---|
| `lib/withings-ingest.ts` | o cron, o webhook **e** o puxar-a-tela |
| `lib/withings-subscriptions.ts` | o cron, de hora a hora |
| `app/api/cron/wearables-probe/route.ts` | a sondagem |
| `app/api/wearables/disconnect/route.ts` | ao desligar |

O cron já relê os tokens entre a assinatura e a ingestão — essa corrida está
fechada. **As outras não:** uma medição que chega pelo webhook enquanto o cron
corre, ou o paciente a puxar a tela no mesmo instante, fazem dois refreshes com
o mesmo token. O segundo falha, e a Withings invalida **a cadeia inteira**.
Depois disso nenhuma repetição ajuda: só reautorizar.

**2. O webhook engole a falha.** `catch (e) { console.error(...) }` e mais nada.
Nem `lastSyncError`, nem estado, nem contador. A consola do contentor devolve as
linhas do arranque e nada mais — já custou o manguito da clínica uma vez.

**3. Nada marca a ligação como precisando de reautorização.** `grep` por
`status: "ERROR"` nesse caminho devolve **zero**. A ligação fica `CONNECTED` e
morta, e a tela do paciente lê `CONNECTED`.

## A medição em produção, 03/10 — e o que ela mudou

```
[cron/wearables-sync] connections=2 synced=1 withData=1 failed=1 ... ecg=4
[withings/webhook] error: Withings status 503: Invalid Params: invalid refresh_token
[withings/webhook] error: Withings status 601: Same arguments in less than 10 seconds
```

**São duas ligações na mesma conta Withings** — o relógio do Bruno e a braçadeira
da clínica. Uma sincroniza e traz dados (`ecg=4`); a outra morre. E o `601` é a
própria Withings a dizer *"a mesma chamada com os mesmos argumentos em menos de
dez segundos"*: as duas a falar ao mesmo instante.

Isso mudou a T-1: **a trava tinha de ser da conta, não da linha.** Uma por linha
não fecha nada — cada ligação toma a sua e as duas renovam na mesma. O cron já
serializava por conta para o `601`; a renovação passou a usar a mesma chave.

O que é **medido**: duas ligações da mesma conta a chamar ao mesmo tempo, uma a
falhar. O que é **inferido**: que a renovação de uma invalide a cadeia da outra.
A T-5 confirma ou desmente, pelo número de esperas pela trava.

## Decisões de design

**A trava é no banco, não na aplicação.** O produto corre em mais de um
contentor; um `Set` em memória não vê o outro.

**Quem não ganha a trava não falha: espera e relê.** Se outro processo acabou de
renovar, há um access token válido no banco — e o certo é usá-lo, não pedir
outro.

**Uma ligação morta grita.** Reautorização necessária é um estado, não uma linha
de log: fica na ligação, aparece na tela do paciente e no painel da clínica.

**Nada disto é automático na direcção do paciente.** O que o app faz é **dizer**;
quem carrega no botão de reconectar é ele.

## Tarefas

| T | Nome | Depende | Estado |
|---|---|---|---|
| T-1 | [O refresh é um de cada vez](t-1-o-refresh-e-um-de-cada-vez.md) | — | **feita** (03/10) — 3 mutações mortas |
| T-2 | [O webhook não engole a falha](t-2-o-webhook-nao-engole.md) | — | **feita** (03/10) |
| T-3 | [Uma ligação morta grita](t-3-uma-ligacao-morta-grita.md) | T-2 | **feita** (03/10) — falta medir a tela |
| T-4 | [O relógio parado aparece na clínica](t-4-o-relogio-parado-na-clinica.md) | T-3 | **feita** (03/10) — e apanhou um defeito que a T-3 criou: o monitor escondia a ligação em `ERROR` |
| T-5 | [Medir quanto tempo esteve parada, e porquê](t-5-medir-a-parada.md) | T-1..T-3 | **instrumentada** (03/10) — a medição espera uma semana |
| T-6 | [A rede nunca esteve pendurada](t-6-a-rede-nunca-esteve-pendurada.md) | — | **feita** (03/10) — **o cron não era disparado por nada** |

## Suposições

1. **A ligação actual não é recuperável sem o Bruno.** `invalid refresh_token`
   quer dizer que a Withings invalidou a cadeia; a API deles não tem caminho de
   volta. Ele tem de reconectar uma vez, e as tarefas existem para não voltar a
   acontecer.
2. **A trava expira em 30 segundos.** Um processo que morra a meio não pode
   trancar a ligação para sempre.
3. **O estado novo vive na `WearableConnection`**, e não numa tabela nova: é uma
   propriedade da ligação.
4. **A tela do paciente já sabe dizê-lo** — `resumo-de-saude.ts` tem
   `autorizacao_expirada` e casa com `/refresh_token|invalid_grant|unauthor/i`.
   O que falta é alguém escrever o estado, não a tela sabê-lo.

## O que esta atividade não faz

- Não tenta renovar uma cadeia já invalidada: não há API para isso.
- Não envia nada ao paciente automaticamente. Ele vê quando abre.
