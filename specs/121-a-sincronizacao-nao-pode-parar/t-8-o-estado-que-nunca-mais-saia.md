# T-8: O estado que nunca mais saía

**Status:** implementado — QA e review pendentes
**Depende de:** T-3

## O defeito, que é meu e é desta atividade

A **T-3** passou a marcar `status: "ERROR"` numa falha fatal, para a ligação
morta gritar em vez de morrer calada. Certo.

`limparEstadoDaLigacao` — a função que desfaz isso quando uma renovação corre
bem — limpava `needsReauthAt`, `lastSyncError` e `lastSyncErrorAt`, e **deixava
o `status` em `ERROR`**.

E o webhook só aceita `CONNECTED`.

Logo: **uma falha fatal transitória desligava o tempo real de vez.** A ligação
voltava a sincronizar de quinze em quinze minutos pela rede, sem pendência
nenhuma na tela a explicar o atraso — porque os campos que a tela lê tinham sido
limpos. Um defeito nosso com a cara exacta de *"a Withings hoje está lenta"*.

É a ausência silenciosa de novo, só que mais lenta. Por isso cabe nesta
atividade e não noutra.

## A correção

```ts
where: {
  id: connectionId,
  status: { in: ["CONNECTED", "ERROR"] },
  OR: [{ needsReauthAt: { not: null } }, { lastSyncError: { not: null } }, { status: "ERROR" }],
},
data: { needsReauthAt: null, lastSyncError: null, lastSyncErrorAt: null, status: "CONNECTED" },
```

**Só sobe de `ERROR`.** Uma ligação `DISCONNECTED` ou revogada não ressuscita
porque uma chamada correu bem — seria escrever num prontuário por conta de uma
ligação que a pessoa desligou.

## Arquivos afetados

- `lib/withings-estado-da-ligacao.ts`
- `__tests__/wearables/uma-ligacao-doente-nao-cala-a-irma.test.ts`

## Critérios de aceite

- [x] Uma renovação bem sucedida devolve `status: "CONNECTED"`
- [x] `DISCONNECTED` não ressuscita
- [x] Mutação: tirar o `status: "CONNECTED"` mata 1 teste
- [ ] QA aprovado
- [ ] Code review feito
