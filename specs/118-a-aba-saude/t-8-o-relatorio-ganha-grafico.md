# T-8: O relatório ganha gráfico, e a triagem perde peso

**Status:** concluído (02/10/2026) — QA pendente
**Depende de:** T-5 (o relatório que o paciente pede), 119 T-9 (a gaveta certa)

## O pedido

> *"só acho que no layout do relatório falta informação, gráfico, quero no mesmo
> estilo que o Sonar faz, o próprio Withings faz…"*
>
> *"Veja como deixar a triagem mais leve sem mexer nas que os pacientes já
> fizeram"* — Bruno, 02/10/2026

## O que falta, e o que já está no banco

O papel mostra **um número por métrica**. O banco tem a **série diária** de cada
uma, e nunca ninguém a desenhou:

| já guardado, por dia | hoje no papel |
|---|---|
| `sleepDuration`, `deepMinutes`, `remMinutes`, `lightMinutes`, `awakeMinutes` | um número de minutos |
| `restingHr`, `hrv`, `spo2` | um número cada |
| `steps` | um número |
| cada leitura de pressão, com a hora | a média e a última |

Um número sozinho não responde à pergunta que leva alguém ao médico — *o que
mudou* —, e é precisamente isso que o Withings e a referência que o Bruno
escolheu mostram: **a linha**.

## As decisões

### Buraco é buraco — a linha não atravessa

Uma linha que liga segunda a sábado por cima de quatro dias sem dado **conta uma
história que não aconteceu**. É a mesma regra do traçado do ECG (099 T-9), onde
apagar uma amostra encurtava a gravação: ali custou 1 segundo em 30; aqui custa
uma tendência inventada.

A linha interrompe-se, e o papel diz quantos dias têm dado — como já diz.

### Sem faixa de referência, sem cor que julga

Saiu na 099 T-2 e não volta por um gráfico novo. **Nenhuma banda verde de
"normal"**, nenhuma linha a vermelho quando sobe. A linha é a pessoa; a régua é
ela própria, e quem lê é quem sabe ler.

O eixo também não começa em zero por hábito: começa onde os dados começam, com o
**mínimo e o máximo escritos**, senão a escala sugere uma variação que não existe.

### SVG embutido, sem biblioteca e sem rede

Pela mesma razão de não carregar fonte do Google: um documento clínico não pede
nada a terceiros enquanto alguém o lê. E um gráfico que depende de JavaScript não
sai no PDF que a pessoa guarda.

### O sono mostra as fases, porque é isso que ele é

Sete horas de sono com uma hora de profundo e sete horas com três são noites
diferentes. A barra empilhada — profundo, leve, REM, acordado — é o que o
aparelho entrega e o que o app deles desenha.

### A triagem fica leve por **arrumação**, nunca por omissão

> *"sem mexer nas que os pacientes já fizeram"*

Nada do que a pessoa respondeu sai do papel. O que muda é a forma:

- de **uma tabela de 8 a 20 linhas** para **grupos** — quem é, o histórico, as
  medidas — em colunas, com o rótulo pequeno por cima do valor;
- sem fio entre cada linha: o fio passa a separar grupos, não factos;
- um campo sem resposta continua a não aparecer, como já acontece.

A secção deixa de ser a mais pesada da folha sem perder uma palavra.

## Passos

1. `lib/grafico-de-linha.ts`: série → SVG. A parte verificável, fora do render.
2. `lib/patient-monitoring.ts`: a série diária viaja ao lado do resumo.
3. `lib/patient-report.ts`: a linha debaixo de cada número; a barra das fases do
   sono; a pressão com as duas linhas; a triagem em grupos.
4. Testes com séries que o banco produz — com buracos — e mutação.

## Arquivos afetados

- `lib/grafico-de-linha.ts` (novo)
- `lib/patient-monitoring.ts`
- `lib/patient-report.ts`
- `__tests__/...` (novo)

## Critérios de aceite

- [x] Cada métrica com 2+ dias de dado mostra a sua linha
- [x] **A linha não atravessa dias sem dado**
- [x] O mínimo e o máximo do período estão escritos
- [x] Nenhuma banda de referência, nenhuma cor que julgue
- [x] O sono mostra as fases quando elas vieram
- [~] A pressão mostra sistólica e diastólica na mesma caixa — **sem linha**: a série de pressão não vem por dia do `WearableDataPoint`, vem leitura a leitura do `BloodPressureReading`, e o `getMonitoringData` ainda não a devolve como série
- [x] Nada de rede: nenhum `<script>`, nenhuma fonte, nenhuma imagem externa
- [x] A triagem mostra **tudo** o que mostrava, em menos espaço
- [x] Sai igual em EN e PT
