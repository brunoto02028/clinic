# T-9: A gaveta vazia — três leitores procuram onde ninguém escreve

**Status:** concluído (02/10/2026) — QA online pendente
**Depende de:** nenhuma

## Como apareceu

O Bruno gerou o primeiro relatório pelo app e mandou a tela, ao lado da aba
Saúde:

> *"Está faltando bastante informação no relatório né?"*

| a aba Saúde mostra | o relatório mostra |
|---|---|
| Resting HR **54 bpm** | — |
| SpO2 **99%** | — |
| Sleep 3h43m | Sleep 223 min ✓ |
| Steps 1.590 | Steps 919.5 |

## O que está errado, e é maior do que o relatório

A ingestão da Withings escreve o `WearableDataPoint` em **três** baldes:

| `dataType` | o que leva |
|---|---|
| `ACTIVITY` | `steps`, calorias, minutos ativos |
| `VITALS` | `spo2`, `bodyTemperature`, `restingHr` |
| `SLEEP` | `sleepDuration`, fases, `hrv`, `restingHr` |

**Nunca escreve `BODY`.** O único escritor de `BODY` em todo o repositório é
`app/api/biohacking/terra/webhook/route.ts` — a integração Terra, que está
desligada.

E **três** leitores procuram `restingHr`, `hrv` e `spo2` exactamente em `BODY`:

| ficheiro | o que fica mudo |
|---|---|
| `lib/patient-monitoring.ts` | o relatório do paciente — o que o Bruno viu |
| `app/api/admin/patients/[id]/monitoring/route.ts` | **a tela de monitoramento da clínica** |
| `lib/monitoring-deviation.ts` | **a detecção de desvio da clínica** |

Como só a Withings está ligada, isto vale para **todos** os pacientes. A clínica
— que é o centro de comando — vê três linhas vazias e um alerta que nunca
dispara, e nada distingue *"o paciente não mediu"* de *"estamos a olhar para a
gaveta errada"*.

É a família de defeito desta atividade inteira: **a ausência silenciosa**. Desta
vez a culpa não é da API deles; é nossa.

## A decisão: um mapa só, lido pelos três

O erro aconteceu porque cada leitor escolheu o seu balde **por memória**. A
correção não é arranjar os três — é fazer com que não haja três escolhas.

`lib/onde-mora-a-metrica.ts` passa a dizer, num sítio, onde cada métrica vive. Os
três leitores perguntam-lhe.

### `restingHr` vive em dois sítios, e isso é uma escolha

A Withings entrega-a no resumo do sono **e** nas medições do dia. Não são a mesma
coisa:

- a do **sono** é a frequência em repouso de verdade — a noite inteira, deitado;
- a das **medições** é a média do que o aparelho capturou durante o dia, que
  depende de quando a pessoa mediu.

Fica a do sono, com a das medições como recurso quando não houve noite registada.
Dizer qual foi usada importa, porque um número que muda de origem entre dois dias
não é uma série.

### Passos não têm casas decimais

`Steps 919.5` é a média do período impressa como se fosse uma contagem. Ninguém
deu meio passo. O número arredonda, e as unidades que **são** fraccionadas —
mmHg, horas, ms — continuam como estão.

### E a média tem de se dizer média

A aba diz **1.590** (hoje) e o relatório **919,5** (média dos dias com dado). Os
dois certos, e contraditórios para quem lê. O relatório já diz *"2 days with
data"*; passa a dizer que o número é a média desses dias.

## Passos

1. `lib/onde-mora-a-metrica.ts`: o mapa, e a junção de séries para o `restingHr`.
2. Os três leitores passam a usá-lo.
3. Passos arredondam; a média diz-se média.
4. Testes com o estado que o banco produz — pontos `SLEEP`/`VITALS`/`ACTIVITY`
   reais, nunca um `BODY` que ninguém escreve — e mutação.

## Arquivos afetados

- `lib/onde-mora-a-metrica.ts` (novo)
- `lib/patient-monitoring.ts`
- `lib/monitoring-deviation.ts`
- `app/api/admin/patients/[id]/monitoring/route.ts`
- `lib/patient-report.ts` (a palavra "média")
- `__tests__/...` (novo)

## Critérios de aceite

- [x] Um paciente com dados Withings vê FC de repouso, VFC e SpO2 **no relatório**
- [x] A tela de monitoramento da clínica mostra os três
- [x] A detecção de desvio avalia os três
- [x] `restingHr` prefere a do sono e recorre à das medições
- [x] Passos sem casa decimal
- [x] O relatório diz que o número é a média dos dias com dado
- [x] Nenhum teste fixa um ponto `BODY` — ele não existe para a Withings
