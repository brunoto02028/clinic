# T-6: O SpO₂ é média de médias, e o papel não diz

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

Que um número do papel não se apresente como uma medida quando é uma média de
médias.

## Contexto

`lib/withings-vitals.ts:284` faz a média dos SpO₂ **do dia**:

```ts
const spo2 = mean(list.map((v) => v.spo2).filter(...));
```

Depois `resumirSerie` faz a média **dos dias**. O número impresso é uma média de
médias não ponderada: um dia com uma medição pesa igual a um dia com oito.

O papel escreve-o ao lado de `restingHr` — que é o **mínimo** do dia — e de `hrv`
— que é a média de duas janelas da noite. Três grandezas diferentes, com a mesma
aparência, na mesma coluna.

Nada aqui está a inventar dado. O que falta é **dizê-lo**: a mesma regra que fez
`frasePadraoDaEscala` existir no papel do ECG.

## Passos

1. `lib/onde-mora-a-metrica.ts`: um mapa `COMO_FOI_CALCULADO` com uma frase por
   métrica, nas duas línguas — *"média das medições do dia"*, *"a menor
   frequência do dia"*, *"média do início e do fim da noite"*, *"o que a Withings
   mede para a noite"*.
2. `lib/patient-report.ts`: a frase sai em letra pequena na linha da métrica,
   onde já sai *"média dos N dias com dados"*.
3. A métrica sem frase não ganha nenhuma — e um teste exige que **toda** métrica
   impressa tenha a sua, para a próxima não entrar muda.
4. O app não muda nesta tarefa: a tela tem um toque para o detalhe, e o detalhe é
   onde isto cabe. Fica para a 118.

## Arquivos afetados

- `lib/onde-mora-a-metrica.ts`, `lib/patient-report.ts`
- `__tests__/wearables/o-numero-diz-como-foi-feito.test.ts` (novo)

## Critérios de aceite

- [ ] Cada métrica impressa traz a frase de como foi calculada, na língua do
      papel
- [ ] Uma métrica nova sem frase quebra um teste nomeado
- [ ] As frases não julgam nem interpretam — descrevem a conta
- [ ] Nenhum número muda de valor nesta tarefa
