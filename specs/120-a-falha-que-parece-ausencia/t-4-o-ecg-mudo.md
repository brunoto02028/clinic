# T-4: O ECG mudo — o `throw` que o `catch` dos vitais engole

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

Que uma falha a buscar o ECG não desapareça dentro de uma mensagem sobre outra
coisa.

## Contexto

`lib/withings-ingest.ts:771` tem o `catch` do bloco dos vitais:

```
console.error("[withings-ingest] vitals failed:", e?.message);
```

O bloco inclui o ECG. Em 02/10 o `withingsEcg` passou a **relançar** em vez de
devolver `[]` — correcto —, mas o `throw` sobe para este `catch`, que o regista
como *"vitals failed"* e continua. O ECG falha, o log fala de sinais vitais, e a
sincronização conta-se como bem sucedida.

Agravante: a condição de pedir o sinal é *"ainda não tenho o sinal"*. Uma falha
engolida faz a ingestão pedir outra vez, a cada passagem, para sempre, calada.

## Passos

1. Separar o `try` do ECG do `try` dos vitais — duas falhas diferentes, dois
   nomes diferentes.
2. A mensagem do ECG diz o que falhou e o `signalId`.
3. O resultado da ingestão passa a trazer o que falhou, para a T-1 o escrever.
4. Um erro no ECG **não** custa ao paciente a pressão, o sono e a actividade —
   essa parte do comentário actual está certa e fica.

## Arquivos afetados

- `lib/withings-ingest.ts`
- `__tests__/wearables/o-ecg-que-falha-diz-que-falhou.test.ts` (novo)

## Critérios de aceite

- [ ] `withingsEcg` a rejeitar produz uma mensagem que nomeia o ECG, não os
      vitais
- [ ] O sono, a pressão e a actividade continuam a ser guardados
- [ ] O retorno da ingestão nomeia a falha
- [ ] Mutação: juntar os dois `try` outra vez mata um teste nomeado
