# 114 T-1 — Medir antes de consertar

**Data:** 30/09/2026 · **Onde:** leitura de código e dos logs de produção.
**Resultado:** a **tela vazia tem causa nomeada e provada**. O **"parou em 24/09"**
ainda não — falta uma leitura do banco de produção.

As duas perguntas do `plan.md` tinham mesmo de ser separadas. Elas têm respostas
diferentes, e uma delas nem é um defeito de sincronia.

---

## 1. Por que "View my data" está vazio

**Porque um medidor de pressão não produz nada do que aquela tela mostra.**

A tela (`app/dashboard/devices/page.tsx`) busca duas coisas:

```
fetch("/api/wearables/connections")
fetch("/api/wearables/data?days=7")
```

A segunda lê **só** a tabela `WearableDataPoint`, cujos tipos são `SLEEP`,
`ACTIVITY`, `BODY`, `DAILY`, `NUTRITION` e `VITALS` — sono, passos, HRV, SpO2,
temperatura.

**A pressão arterial não entra nessa tabela.** Ela vai para
`BloodPressureReading`, por outro caminho (`saveBloodPressure`, ou a atribuição,
quando o aparelho é da clínica). Contagem de referências a pressão naquela tela:
**zero**.

Então, para um **BPM Connect**, que é uma braçadeira e mede pressão:

| o que a tela mostra | o que o aparelho produz |
|---|---|
| sono, passos, HRV, SpO2, temperatura | pressão arterial |

O conjunto é vazio. **A tela está certa ao mostrar nada, e errada ao não
explicar** — diz "Last 7 days" e deixa o utilizador concluir que a ligação
falhou, quando o dado dele está noutra tela, chegou, e está lá.

### E há um segundo motivo, que se soma

`lib/withings-ingest.ts` decide o que buscar conforme o papel da ligação:

- ligação **da clínica** (`isClinicDevice`): `wanted = ["bp"]` — só pressão, e
  cada leitura vai para a **caixa de atribuição**, não para um prontuário;
- ligação **pessoal** de uma conta que também é da clínica:
  `pulaPressaoDaClinica` tira `bp` da lista.

Isto foi desenhado assim de propósito (092 T-1, e o review de 27/09): num
aparelho partilhado, só a ligação da clínica sabe de quem é a leitura. Mas a
consequência é que, numa ligação da clínica, **`WearableDataPoint` nunca recebe
uma linha** — e a tela "View my data" lê exatamente essa tabela.

**Conclusão 1:** a tela vazia não é sintoma de ligação quebrada. É uma tela a
prometer uma categoria de dado que este aparelho não dá. Isto é a **T-4**, e
agora tem causa em vez de suposição.

---

## 2. Por que a pressão parou em 24/09 — **ainda não medido**

Aqui a hipótese da assinatura caída continua de pé, mas **não foi verificada**, e
não vou consertar no escuro — foi o que custou três tentativas no `version.json`.

O que o código diz, e que muda o que é preciso olhar:

**`lastSyncedAt` não mente sobre ter corrido.** Ele é escrito no **fim** de um
ingest bem sucedido (`withings-ingest.ts:351`), depois do trabalho, junto com
`status: "CONNECTED"` e `lastReadingAt`. Então *"Last sync: 30 Sep"* significa que
um ingest correu hoje e terminou — e não encontrou leitura nova, ou encontrou e
ela foi para outro lado.

Isso **enfraquece** a causa 4 do plano (o token expirado a escrever data mesmo
assim) e **fortalece** duas outras:

- a conta é da clínica, as leituras vão para a **caixa de medições não
  atribuídas**, e ninguém as atribuiu desde 24/09 — nesse caso o dado **existe**
  e está à espera de uma pessoa;
- ou a Withings deixou de devolver leituras novas nessa janela.

Os logs de produção que consegui ler (as ~400 linhas que a API do Coolify
devolve) cobrem só o arranque do contentor: duas linhas com `wearable`, nenhuma
de webhook recebido. **Janela pequena demais para concluir** — ausência aqui não
é prova.

### O que falta, e é uma coisa só

Uma leitura do banco de **produção**, sem escrita:

1. as ligações Withings deste utilizador: quantas, `isClinicDevice`,
   `providerUserId`, `status`, `lastSyncedAt`, `lastReadingAt`,
   `tokenExpiresAt`, `notifyConfirmedAppli`, `notifyCheckedAt`;
2. quantas leituras em `BloodPressureReading` por data, nos últimos 30 dias, e
   por qual `source`;
3. quantas medições estão **não atribuídas** à espera;
4. quantas linhas em `WearableDataPoint`, por `dataType` e data.

Com isso, a causa fica nomeada. Sem isso, qualquer conserto é palpite.

---

## O que já dá para dizer ao Bruno

- O *"View my data"* vazio **não é a ligação partida**. É a tela errada para
  aquele aparelho, e ela não avisa.
- As leituras de pressão de 24/09 que ele viu **chegaram por este caminho** — o
  caminho funciona, ou funcionava.
- A hipótese mais provável agora **não** é assinatura caída: é a pressão do
  aparelho da clínica estar a parar na **caixa de atribuição**, à espera de
  alguém dizer de quem é cada leitura.

## Critérios de aceite

- [x] Existe uma tabela: tipo de dado × onde é gravado × qual tela o lê
- [x] Está escrito o que `lastSyncedAt` realmente significa
- [ ] A causa do "parou em 24/09" está **nomeada** — falta a leitura de produção
- [x] As duas perguntas do `plan.md` têm resposta separada — e a primeira está
      fechada
